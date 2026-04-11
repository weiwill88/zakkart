function success(data = null, message = 'ok') {
  return {
    code: 0,
    message,
    data
  };
}

function failure(code = 500, message = '服务异常', details) {
  return {
    code,
    message,
    data: details || null
  };
}

module.exports = {
  success,
  failure
};
