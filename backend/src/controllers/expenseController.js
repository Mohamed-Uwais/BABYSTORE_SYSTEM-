const expenseModel = require('../models/expenseModel');

async function getCategories(req, res) {
  try {
    const categories = await expenseModel.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Get categories error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCategory(req, res) {
  try {
    const { name, is_recurring } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Category name is required' });
    const id = await expenseModel.createCategory(name.trim(), !!is_recurring);
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error('Create category error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateCategory(req, res) {
  try {
    await expenseModel.updateCategory(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Update category error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getExpenses(req, res) {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();
    const [expenses, summary] = await Promise.all([
      expenseModel.getExpenses({ month, year }),
      expenseModel.getMonthlySummary({ month, year }),
    ]);
    res.json({ success: true, data: { expenses, summary } });
  } catch (err) {
    console.error('Get expenses error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createExpense(req, res) {
  try {
    const { category_id, amount, expense_date, description, payment_method, is_recurring, recurring_day } = req.body;
    if (!category_id || !amount || !expense_date) {
      return res.status(400).json({ success: false, message: 'Category, amount, and date are required' });
    }
    const receipt_url = req.file ? `/uploads/${req.file.filename}` : req.body.receipt_url || null;
    const id = await expenseModel.createExpense({
      category_id, amount, expense_date, description, payment_method,
      receipt_url, is_recurring, recurring_day, created_by: req.user.id,
    });
    const expense = await expenseModel.getExpenseById(id);
    res.json({ success: true, data: expense });
  } catch (err) {
    console.error('Create expense error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateExpense(req, res) {
  try {
    const { category_id, amount, expense_date, description, payment_method, is_recurring, recurring_day } = req.body;
    const receipt_url = req.file ? `/uploads/${req.file.filename}` : req.body.receipt_url || null;
    await expenseModel.updateExpense(req.params.id, {
      category_id, amount, expense_date, description, payment_method,
      receipt_url, is_recurring, recurring_day,
    });
    const expense = await expenseModel.getExpenseById(req.params.id);
    res.json({ success: true, data: expense });
  } catch (err) {
    console.error('Update expense error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteExpense(req, res) {
  try {
    await expenseModel.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete expense error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getExpensesForReport(req, res) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to are required' });
    const [total, breakdown] = await Promise.all([
      expenseModel.getExpensesForDateRange(from, to),
      expenseModel.getExpenseBreakdownForDateRange(from, to),
    ]);
    res.json({ success: true, data: { total, breakdown } });
  } catch (err) {
    console.error('Expense report error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getCategories, createCategory, updateCategory, getExpenses, createExpense, updateExpense, deleteExpense, getExpensesForReport };
