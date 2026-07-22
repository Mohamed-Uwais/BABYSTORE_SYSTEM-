const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requirePermission, restrictTo } = require('../middleware/authMiddleware');

router.get('/best-sellers', orderController.bestSellers);
router.get('/search-for-return', orderController.searchForReturn);
router.get('/pending', orderController.getPendingOrders);
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrder);
router.get('/:id/returns', orderController.getReturns);
router.get('/:id/return-items', orderController.getReturnItems);
router.post('/checkout', orderController.checkout);
router.post('/return-exchange', orderController.returnExchange);
router.post('/:id/refund', requirePermission('refunds'), orderController.refundOrder);
router.post('/:id/accept', orderController.acceptOrder);
router.post('/:id/reject', orderController.rejectOrder);
router.patch('/:id/adjust-total', restrictTo('owner'), orderController.adjustTotal);

module.exports = router;
