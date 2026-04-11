const { getCollection } = require('../config/database');
const { signToken } = require('../utils/token');

const DEV_SMS_CODE = process.env.DEV_SMS_CODE || '123456';
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

  return {
    mobile,
    sent: true,
    mock_code: DEV_SMS_CODE,
    expires_in_seconds: 300,
    message: '开发阶段使用固定验证码'
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

  if (code !== DEV_SMS_CODE) {
    const error = new Error('验证码错误');
    error.code = 401;
    throw error;
  }

  const dbUser = await findUserByPhone(mobile);
  const fallbackUser = seededUsers[mobile] || null;

  if (!dbUser && !fallbackUser) {
    const error = new Error('该手机号未注册，请先在组织成员中添加账号');
    error.code = 403;
    throw error;
  }

  const user = normalizeUser(dbUser || fallbackUser, {
    last_login_at: new Date().toISOString()
  });

  if (dbUser) {
    await getCollection(USERS_COLLECTION).doc(dbUser._id).update({
      data: {
        last_login_at: user.last_login_at
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

module.exports = {
  'auth.smsSend': smsSend,
  'auth.smsLogin': smsLogin,
  'auth.me': me
};
