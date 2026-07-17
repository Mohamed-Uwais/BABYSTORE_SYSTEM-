const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function listUsers(req, res) {
  try {
    const users = await userModel.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createUser(req, res) {
  try {
    const { full_name, username, password, role, phone, permissions } = req.body;
    if (!full_name || !username || !password) {
      return res.status(400).json({ success: false, message: 'full_name, username, and password are required' });
    }
    if (role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot create another owner account' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({ full_name, username, password_hash, role: 'cashier', phone });

    const perms = permissions || ['billing', 'orders'];
    await userModel.setPermissions(user.id, perms);
    user.permissions = await userModel.getPermissions(user.id, 'cashier');

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const existing = await userModel.getUserById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    if (existing.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot modify owner account' });
    }

    const { full_name, phone, is_active, password } = req.body;
    let password_hash;
    if (password) password_hash = await bcrypt.hash(password, 10);

    const user = await userModel.updateUser(req.params.id, { full_name, phone, is_active, password_hash });
    user.permissions = await userModel.getPermissions(user.id, user.role);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getPermissions(req, res) {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const permissions = await userModel.getPermissions(user.id, user.role);
    res.json({ success: true, data: { permissions, all_permissions: userModel.ALL_PERMISSIONS } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updatePermissions(req, res) {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Owner permissions cannot be modified' });
    }
    const permissions = await userModel.setPermissions(user.id, req.body.permissions || []);
    res.json({ success: true, data: { permissions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { listUsers, createUser, updateUser, getPermissions, updatePermissions };
