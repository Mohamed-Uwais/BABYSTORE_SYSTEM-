const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const reportRoutes = require('./routes/reportRoutes');
const insightRoutes = require('./routes/insightRoutes');
const publicRoutes = require('./routes/publicRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const koombiyoRoutes = require('./routes/koombiyoRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const koombiyoController = require('./controllers/koombiyoController');
const courierController = require('./controllers/courierController');
const userController = require('./controllers/userController');
const { protect, requirePermission } = require('./middleware/authMiddleware');
const { randomUUID } = require('node:crypto');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[JSON_PARSE_ERROR]');
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid JSON in request body',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// Never log checkout payloads, tokens, or query strings.
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  const started = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400 || process.env.NODE_ENV !== 'production') {
      console.log('[REQUEST]', { requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started });
    }
  });
  next();
});

// Public API (no auth required — for website visitors)
app.use('/api/public', publicRoutes);

// Koombiyo webhook (no auth — called by Koombiyo servers)
app.post('/webhook/koombiyo', koombiyoController.webhook);

app.use('/api/auth', authRoutes);
app.use('/api/products', protect, requirePermission('inventory', 'billing'), productRoutes);
app.use('/api/orders', protect, requirePermission('orders', 'billing'), orderRoutes);
app.use('/api/customers', protect, requirePermission('customers', 'billing'), customerRoutes);
app.use('/api/suppliers', protect, requirePermission('purchasing'), supplierRoutes);
app.use('/api/purchase-orders', protect, requirePermission('purchasing'), purchaseOrderRoutes);
app.use('/api/catalog', protect, requirePermission('inventory'), catalogRoutes);
app.use('/api/inventory', protect, requirePermission('inventory'), inventoryRoutes);
app.use('/api/settings', protect, (req, res, next) => {
  if (req.method === 'GET' && req.path === '/') return next(); // Receipt/store metadata is needed by cashiers.
  return requirePermission('settings')(req, res, next);
}, settingsRoutes);
app.use('/api/dashboard', protect, requirePermission('reports'), dashboardRoutes);
app.use('/api/delivery', protect, requirePermission('deliveries', 'billing'), deliveryRoutes);
app.use('/api/tags', protect, requirePermission('inventory'), tagRoutes);
app.use('/api/reports', protect, requirePermission('reports'), reportRoutes);
app.use('/api/insights', protect, requirePermission('reports'), insightRoutes);
app.use('/api/promotions', protect, requirePermission('inventory', 'billing'), promotionRoutes);
app.use('/api/koombiyo', protect, requirePermission('deliveries'), koombiyoRoutes);
app.use('/api/quotations', protect, requirePermission('billing'), quotationRoutes);
app.use('/api/settlements', protect, requirePermission('reports'), settlementRoutes);
app.use('/api/expenses', protect, requirePermission('reports'), expenseRoutes);
app.use('/api/chatbot', protect, requirePermission('reports'), chatbotRoutes);

app.get('/api/couriers', protect, requirePermission('deliveries', 'billing'), courierController.getCouriers);
app.post('/api/couriers/assign', protect, requirePermission('deliveries'), courierController.assignDelivery);
app.get('/api/couriers/tracking/:orderId', protect, requirePermission('deliveries', 'orders'), courierController.getTracking);
app.get('/api/deliveries', protect, requirePermission('deliveries'), courierController.getDeliveryOrders);
app.put('/api/deliveries/:id/tracking', protect, requirePermission('deliveries'), courierController.updateTracking);

// User management (owner only)
app.get('/api/users', protect, requirePermission('settings'), userController.listUsers);
app.post('/api/users', protect, requirePermission('settings'), userController.createUser);
app.put('/api/users/:id', protect, requirePermission('settings'), userController.updateUser);
app.get('/api/users/:id/permissions', protect, requirePermission('settings'), userController.getPermissions);
app.put('/api/users/:id/permissions', protect, requirePermission('settings'), userController.updatePermissions);

// Uploaded product images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LITTORA API is running' });
});

app.get('/api/me', protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

if (process.env.PRINT_REVIEW === '1') {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('/{*page}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.listen(PORT, process.env.PRINT_REVIEW === '1' ? '127.0.0.1' : undefined, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
