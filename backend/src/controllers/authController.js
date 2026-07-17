const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await userModel.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const permissions = await userModel.getPermissions(user.id, user.role);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role, permissions }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
}

module.exports = { login };
