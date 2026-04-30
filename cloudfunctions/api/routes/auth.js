const crypto = require('crypto');
const { getCollection } = require('../config/database');
const { signToken } = require('../utils/token');
const { sendTencentSms, isSmsConfigured } = require('../utils/tencent-sms');

const DEV_SMS_CODE = process.env.DEV_SMS_CODE || '123456';
const SMS_EXPIRES_SECONDS = Number(process.env.SMS_EXPIRES_SECONDS || 300);
const SMS_SEND_INTERVAL_SECONDS = Number(process.env.SMS_SEND_INTERVAL_SECONDS || 60);
const SMS_MAX_ATTEMPTS = Number(process.env.SMS_MAX_ATTEMPTS || 5);
const USERS_COLLECTION = 'users';
const ROLE_NAME_MAP = {
  super_admin: '超级管理员',
  admin: '甲方管理员',
  merchandiser: '甲方跟单员',
  supplier_owner: '供应商负责人',
  supplier_member: '供应商成员'
};
const LEGACY_ADMIN_PERMISSIONS = [
  { permission_key: 'module_dashboard', granted: true },
  { permission_key: 'module_product', granted: true },
  { permission_key: 'module_part_type', granted: true },
  { permission_key: 'module_supplier', granted: true },
  { permission_key: 'module_order', granted: true },
  { permission_key: 'module_contract', granted: true },
  { permission_key: 'module_quality', granted: true },
  { permission_key: 'module_inventory', granted: true },
  { permission_key: 'module_shipment', granted: true },
  { permission_key: 'module_freight', granted: true },
  { permission_key: 'module_notification', granted: true },
  { permission_key: 'module_admin_user', granted: true }
]

const seededUsers = {
  '17521723946': {
    _id: 'user_super_admin_001',
    mobile: '17521723946',
    name: '韦东东',
    role: 'super_admin',
    role_name: '超级管理员',
    org_id: 'org_platform',
    org_name: 'Zakkart',
    permissions: [{ permission_key: '*', granted: true }]
  },
  '13262515903': {
    _id: 'user_admin_001',
    mobile: '13262515903',
    name: '闵一',
    role: 'admin',
    role_name: '甲方管理员',
    org_id: 'org_platform',
    org_name: 'Zakkart',
    permissions: LEGACY_ADMIN_PERMISSIONS
  }
};

async function smsSend({ params }) {
  const mobile = String(params.mobile || '').trim();

  if (!/^1\d{10}$/.test(mobile)) {
    const error = new Error('手机号格式不正确');
    error.code = 400;
    throw error;
  }

  const dbUser = await findUserByPhone(mobile);
  const fallbackUser = seededUsers[mobile] || null;

  if (!dbUser && !fallbackUser) {
    const error = new Error('该手机号未注册，请先在组织成员中添加账号');
    error.code = 403;
    throw error;
  }

  if (shouldUseMockSms()) {
    return {
      mobile,
      sent: true,
      mock: true,
      expires_in_seconds: SMS_EXPIRES_SECONDS,
      message: '开发阶段使用固定验证码'
    };
  }

  if (!dbUser) {
    const error = new Error('该手机号仅存在于本地种子账号，请先导入 users 集合后再启用短信登录');
    error.code = 403;
    throw error;
  }

  assertCanSendSms(dbUser);

  const code = createSmsCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SMS_EXPIRES_SECONDS * 1000).toISOString();

  await sendTencentSms({
    mobile,
    code,
    expireMinutes: Math.ceil(SMS_EXPIRES_SECONDS / 60)
  });

  await getCollection(USERS_COLLECTION).doc(dbUser._id).update({
    data: {
      sms_verification: {
        code_hash: hashSmsCode(mobile, code),
        expires_at: expiresAt,
        requested_at: now.toISOString(),
        attempts: 0
      }
    }
  });

  return {
    mobile,
    sent: true,
    mock: false,
    expires_in_seconds: SMS_EXPIRES_SECONDS,
    message: '验证码已发送'
  };
}

async function smsLogin({ params }) {
  const mobile = String(params.mobile || '').trim();
  const code = String(params.code || '').trim();

  if (!/^1\d{10}$/.test(mobile)) {
    const error = new Error('手机号格式不正确');
    error.code = 400;
    throw error;
  }

  if (!code) {
    const error = new Error('请输入验证码');
    error.code = 400;
    throw error;
  }

  const dbUser = await findUserByPhone(mobile);
  const fallbackUser = seededUsers[mobile] || null;

  if (!dbUser && !fallbackUser) {
    const error = new Error('该手机号未注册，请先在组织成员中添加账号');
    error.code = 403;
    throw error;
  }

  if (shouldUseMockSms()) {
    if (code !== DEV_SMS_CODE) {
      const error = new Error('验证码错误');
      error.code = 401;
      throw error;
    }
  } else {
    if (!dbUser) {
      const error = new Error('该手机号仅存在于本地种子账号，请先导入 users 集合后再启用短信登录');
      error.code = 403;
      throw error;
    }

    await verifySmsCode(dbUser, mobile, code);
  }

  const user = normalizeUser(dbUser || fallbackUser, {
    last_login_at: new Date().toISOString()
  });

  if (dbUser) {
    await getCollection(USERS_COLLECTION).doc(dbUser._id).update({
      data: {
        last_login_at: user.last_login_at,
        sms_verification: null
      }
    });
  }

  const token = signToken({
    user_id: user._id,
    mobile: user.mobile,
    role: user.role,
    org_id: user.org_id
  });

  return {
    token,
    user
  };
}

async function me({ auth }) {
  const dbUser = await findUserById(auth.user_id);
  const user = dbUser ? normalizeUser(dbUser) : auth;

  return {
    user
  };
}

async function findUserByPhone(phone) {
  try {
    const result = await getCollection(USERS_COLLECTION)
      .where({ phone })
      .limit(1)
      .get();

    return result.data[0] || null;
  } catch (error) {
    return null;
  }
}

async function findUserById(userId) {
  if (!userId) {
    return null;
  }

  try {
    const result = await getCollection(USERS_COLLECTION).doc(userId).get();
    return result.data || null;
  } catch (error) {
    return null;
  }
}

function normalizeUser(user, overrides = {}) {
  const mobile = user.phone || user.mobile || '';

  return {
    ...user,
    ...overrides,
    mobile,
    phone: mobile,
    role_name: user.role_name || ROLE_NAME_MAP[user.role] || '管理员'
  };
}

function shouldUseMockSms() {
  return String(process.env.SMS_MOCK || '').toLowerCase() === 'true' || !isSmsConfigured();
}

function assertCanSendSms(user) {
  const requestedAt = user.sms_verification?.requested_at;
  if (!requestedAt) {
    return;
  }

  const elapsedSeconds = (Date.now() - new Date(requestedAt).getTime()) / 1000;
  if (elapsedSeconds < SMS_SEND_INTERVAL_SECONDS) {
    const error = new Error(`验证码发送过于频繁，请 ${Math.ceil(SMS_SEND_INTERVAL_SECONDS - elapsedSeconds)} 秒后再试`);
    error.code = 429;
    throw error;
  }
}

async function verifySmsCode(user, mobile, code) {
  const verification = user.sms_verification || {};
  const expiresAt = verification.expires_at ? new Date(verification.expires_at).getTime() : 0;

  if (!verification.code_hash || !expiresAt || expiresAt <= Date.now()) {
    const error = new Error('验证码已过期，请重新获取');
    error.code = 401;
    throw error;
  }

  const attempts = Number(verification.attempts || 0);
  if (attempts >= SMS_MAX_ATTEMPTS) {
    const error = new Error('验证码错误次数过多，请重新获取');
    error.code = 401;
    throw error;
  }

  if (verification.code_hash !== hashSmsCode(mobile, code)) {
    await getCollection(USERS_COLLECTION).doc(user._id).update({
      data: {
        sms_verification: {
          ...verification,
          attempts: attempts + 1
        }
      }
    });

    const error = new Error('验证码错误');
    error.code = 401;
    throw error;
  }
}

function createSmsCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashSmsCode(mobile, code) {
  return crypto
    .createHash('sha256')
    .update(`${mobile}:${code}:${process.env.JWT_SECRET || ''}`)
    .digest('hex');
}

module.exports = {
  'auth.smsSend': smsSend,
  'auth.smsLogin': smsLogin,
  'auth.me': me,
  __test: {
    hashSmsCode,
    shouldUseMockSms,
    verifySmsCode
  }
};
