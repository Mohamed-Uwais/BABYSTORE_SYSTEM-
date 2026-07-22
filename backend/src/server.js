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
const koombiyoController = require('./controllers/koombiyoController');
const courierController = require('./controllers/courierController');
const userController = require('./controllers/userController');
const { protect, requirePermission } = require('./middleware/authMiddleware');
const userModel = require('./models/userModel');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/settings', protect, requirePermission('settings'), settingsRoutes);
app.use('/api/dashboard', protect, requirePermission('reports'), dashboardRoutes);
app.use('/api/delivery', protect, requirePermission('deliveries', 'billing'), deliveryRoutes);
app.use('/api/tags', protect, requirePermission('inventory'), tagRoutes);
app.use('/api/reports', protect, requirePermission('reports'), reportRoutes);
app.use('/api/insights', protect, requirePermission('reports'), insightRoutes);
app.use('/api/promotions', protect, requirePermission('inventory', 'billing'), promotionRoutes);
app.use('/api/koombiyo', protect, requirePermission('deliveries'), koombiyoRoutes);
app.use('/api/quotations', protect, requirePermission('billing'), quotationRoutes);
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
  const permissions = await userModel.getPermissions(req.user.id, req.user.role);
  res.json({ success: true, data: { ...req.user, permissions } });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ success: false, message: err.message || 'Request failed' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
