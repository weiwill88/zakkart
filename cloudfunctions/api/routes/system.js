const { isSmsConfigured } = require('../utils/tencent-sms');

async function health() {
  const smsMock = String(process.env.SMS_MOCK || '').toLowerCase() === 'true' || !isSmsConfigured();

  return {
    ok: true,
    service: 'zakkart-api',
    env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'local',
    timestamp: new Date().toISOString(),
    features: {
      sms_login: true,
      sms_mock: smsMock,
      wechat_login: false,
      seed_users: true
    }
  };
}

module.exports = {
  'system.health': health
};
