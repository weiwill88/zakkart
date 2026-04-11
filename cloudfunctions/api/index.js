const { initCloud } = require('./config/database');
const { dispatch } = require('./router');
const { success, failure } = require('./utils/response');

// Initialize cloud SDK on cold start
initCloud();

exports.main = async (event = {}, context = {}) => {
  const action = event.action || '';
  const params = event.params || {};
  const token = event.token || '';

  if (!action) {
    return failure(400, '缺少 action');
  }

  try {
    const data = await dispatch({
      action,
      params,
      token,
      event,
      context
    });

    return success(data);
  } catch (error) {
    const code = Number(error.code) || 500;
    const message = error.message || '服务异常';

    console.error('[api] request failed', {
      action,
      params,
      code,
      message,
      stack: error.stack
    });

    return failure(code, message, error.details);
  }
};
