const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const permissions = await userModel.getPermissions(decoded.id, decoded.role);
    req.user = { ...decoded, permissions };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (req.user.role === 'owner') return next();
    const has = perms.some(p => req.user.permissions?.includes(p));
    if (!has) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
    }
    next();
  };
}

module.exports = { protect, restrictTo, requirePermission };
