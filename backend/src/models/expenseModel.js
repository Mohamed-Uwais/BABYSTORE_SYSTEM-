const db = require('../config/db');

async function getCategories() {
  const [rows] = await db.query('SELECT * FROM expense_categories ORDER BY name');
  return rows;
}

async function createCategory(name, isRecurring = false) {
  const [result] = await db.query(
    'INSERT INTO expense_categories (name, is_recurring) VALUES (?, ?)',
    [name, isRecurring]
  );
  return result.insertId;
}

async function updateCategory(id, { name, is_recurring, is_active }) {
  await db.query(
    'UPDATE expense_categories SET name = ?, is_recurring = ?, is_active = ? WHERE id = ?',
    [name, is_recurring, is_active, id]
  );
}

async function getExpenses({ month, year }) {
  const [rows] = await db.query(`
    SELECT e.*, ec.name AS category_name, u.full_name AS created_by_name
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    LEFT JOIN users u ON u.id = e.created_by
    WHERE YEAR(e.expense_date) = ? AND MONTH(e.expense_date) = ?
    ORDER BY e.expense_date DESC, e.created_at DESC
  `, [year, month]);
  return rows;
}

async function getExpenseById(id) {
  const [[row]] = await db.query(`
    SELECT e.*, ec.name AS category_name
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.id = ?
  `, [id]);
  return row;
}

async function createExpense({ category_id, amount, expense_date, description, payment_method, receipt_url, is_recurring, recurring_day, created_by }) {
  const [result] = await db.query(
    `INSERT INTO expenses (category_id, amount, expense_date, description, payment_method, receipt_url, is_recurring, recurring_day, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [category_id, amount, expense_date, description || null, payment_method || 'cash', receipt_url || null, is_recurring || false, recurring_day || null, created_by]
  );
  return result.insertId;
}

async function updateExpense(id, { category_id, amount, expense_date, description, payment_method, receipt_url, is_recurring, recurring_day }) {
  await db.query(
    `UPDATE expenses SET category_id = ?, amount = ?, expense_date = ?, description = ?, payment_method = ?, receipt_url = ?, is_recurring = ?, recurring_day = ?
     WHERE id = ?`,
    [category_id, amount, expense_date, description || null, payment_method || 'cash', receipt_url || null, is_recurring || false, recurring_day || null, id]
  );
}

async function deleteExpense(id) {
  await db.query('DELETE FROM expenses WHERE id = ?', [id]);
}

async function getMonthlySummary({ month, year }) {
  const [[current]] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE YEAR(expense_date) = ? AND MONTH(expense_date) = ?
  `, [year, month]);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const [[previous]] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE YEAR(expense_date) = ? AND MONTH(expense_date) = ?
  `, [prevYear, prevMonth]);

  const [byCategory] = await db.query(`
    SELECT ec.name AS category, COALESCE(SUM(e.amount), 0) AS total
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    WHERE YEAR(e.expense_date) = ? AND MONTH(e.expense_date) = ?
    GROUP BY ec.id, ec.name
    ORDER BY total DESC
  `, [year, month]);

  return {
    total: Number(current.total),
    previous_total: Number(previous.total),
    change: Number(previous.total) > 0
      ? Math.round((Number(current.total) - Number(previous.total)) / Number(previous.total) * 10000) / 100
      : null,
    by_category: byCategory.map(r => ({ category: r.category, total: Number(r.total) })),
  };
}

async function getExpensesForDateRange(from, to) {
  const [[row]] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date <= ?
  `, [from, to]);
  return Number(row.total);
}

async function getExpenseBreakdownForDateRange(from, to) {
  const [rows] = await db.query(`
    SELECT ec.name AS category, COALESCE(SUM(e.amount), 0) AS total
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.expense_date >= ? AND e.expense_date <= ?
    GROUP BY ec.id, ec.name
    ORDER BY total DESC
  `, [from, to]);
  return rows.map(r => ({ category: r.category, total: Number(r.total) }));
}

async function getRecurringExpenses() {
  const [rows] = await db.query(`
    SELECT e.*, ec.name AS category_name
    FROM expenses e
    JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.is_recurring = TRUE
    ORDER BY e.recurring_day
  `);
  return rows;
}

module.exports = {
  getCategories, createCategory, updateCategory,
  getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense,
  getMonthlySummary, getExpensesForDateRange, getExpenseBreakdownForDateRange,
  getRecurringExpenses,
};
