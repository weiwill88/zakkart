const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/system');
const productRoutes = require('./routes/product');
const partTypeRoutes = require('./routes/partType');
const organizationRoutes = require('./routes/organization');
const addressRoutes = require('./routes/address');
const contractRoutes = require('./routes/contract');
const orderRoutes = require('./routes/order');
const batchRoutes = require('./routes/batch');
const statusRoutes = require('./routes/status');
const inspectionRoutes = require('./routes/inspection');
const shipmentRoutes = require('./routes/shipment');
const receivingRoutes = require('./routes/receiving');
const h5Routes = require('./routes/h5');
const freightRoutes = require('./routes/freight');
const notificationRoutes = require('./routes/notification');
const inventoryRoutes = require('./routes/inventory');
const adminUserRoutes = require('./routes/adminUser');
const { verifyToken } = require('./utils/token');

const routes = {
  ...authRoutes,
  ...systemRoutes,
  ...productRoutes,
  ...partTypeRoutes,
  ...organizationRoutes,
  ...addressRoutes,
  ...contractRoutes,
  ...orderRoutes,
  ...batchRoutes,
  ...statusRoutes,
  ...inspectionRoutes,
  ...shipmentRoutes,
  ...receivingRoutes,
  ...h5Routes,
  ...freightRoutes,
  ...notificationRoutes,
  ...inventoryRoutes,
  ...adminUserRoutes
};

const publicActions = new Set([
  'auth.smsSend',
  'auth.smsLogin',
  'system.health',
  'h5.shipmentInfo',
  'h5.driverStep1',
  'h5.driverStep2'
]);

async function dispatch(request) {
  const handler = routes[request.action];

  if (!handler) {
    const error = new Error(`未找到接口: ${request.action}`);
    error.code = 404;
    throw error;
  }

  const auth = publicActions.has(request.action)
    ? null
    : resolveAuth(request.token);

  return handler({
    ...request,
    auth
  });
}

function resolveAuth(token) {
  if (!token) {
    const error = new Error('未登录或登录已失效');
    error.code = 401;
    throw error;
  }

  try {
    return verifyToken(token);
  } catch (error) {
    error.code = 401;
    throw error;
  }
}

module.exports = {
  dispatch
};
