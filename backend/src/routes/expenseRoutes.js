const express = require('express');
const router = express.Router();
const c = require('../controllers/expenseController');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/categories', c.getCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);

router.get('/', c.getExpenses);
router.post('/', upload.single('receipt'), c.createExpense);
router.put('/:id', upload.single('receipt'), c.updateExpense);
router.delete('/:id', c.deleteExpense);

router.get('/report', c.getExpensesForReport);

module.exports = router;
