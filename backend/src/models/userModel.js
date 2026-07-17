const db = require('../config/db');

const ALL_PERMISSIONS = ['billing', 'orders', 'inventory', 'purchasing', 'customers', 'reports', 'deliveries', 'settings', 'refunds'];

async function getUserByUsername(username) {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
    [username]
  );
  return rows[0] || null;
}

async function getUserById(id) {
  const [rows] = await db.query('SELECT id, full_name, username, role, phone, is_active, created_at FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getPermissions(userId, role) {
  if (role === 'owner') return [...ALL_PERMISSIONS];
  const [rows] = await db.query('SELECT permission FROM user_permissions WHERE user_id = ?', [userId]);
  return rows.map(r => r.permission);
}

async function setPermissions(userId, permissions) {
  await db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  if (permissions.length > 0) {
    const valid = permissions.filter(p => ALL_PERMISSIONS.includes(p));
    if (valid.length > 0) {
      const values = valid.map(p => [userId, p]);
      await db.query('INSERT INTO user_permissions (user_id, permission) VALUES ?', [values]);
    }
  }
  return getPermissions(userId, 'cashier');
}

async function getAllUsers() {
  const [users] = await db.query(
    'SELECT id, full_name, username, role, phone, is_active, created_at FROM users ORDER BY role DESC, full_name'
  );
  for (const user of users) {
    user.permissions = await getPermissions(user.id, user.role);
  }
  return users;
}

async function createUser({ full_name, username, password_hash, role, phone }) {
  const [result] = await db.query(
    'INSERT INTO users (full_name, username, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
    [full_name, username, password_hash, role || 'cashier', phone || null]
  );
  return getUserById(result.insertId);
}

async function updateUser(id, { full_name, phone, is_active, password_hash }) {
  const sets = [];
  const params = [];
  if (full_name !== undefined) { sets.push('full_name = ?'); params.push(full_name); }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (password_hash) { sets.push('password_hash = ?'); params.push(password_hash); }
  if (sets.length === 0) return getUserById(id);
  params.push(id);
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return getUserById(id);
}

module.exports = { getUserByUsername, getUserById, getPermissions, setPermissions, getAllUsers, createUser, updateUser, ALL_PERMISSIONS };
