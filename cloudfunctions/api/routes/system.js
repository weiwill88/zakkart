async function health() {
  return {
    ok: true,
    service: 'zakkart-api',
    env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'local',
    timestamp: new Date().toISOString(),
    features: {
      sms_login: true,
      sms_mock: true,
      wechat_login: false,
      seed_users: true
    }
  };
}

module.exports = {
  'system.health': health
};
