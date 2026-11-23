const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  try {
    const user = await userModel.getUserById(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is no longer active' });
    }
    const permissions = await userModel.getPermissions(user.id, user.role);
    req.user = { ...user, permissions };
    return next();
  } catch (error) {
    console.error('[AUTH_SERVICE_ERROR]', { code: error.code || 'UNKNOWN' });
    return res.status(503).json({ success: false, message: 'Unable to verify your session. Please retry.' });
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !(roles.includes(req.user.role)||(req.user.role==='admin'&&roles.includes('owner')))) {
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
    if (['owner','admin'].includes(req.user.role)) return next();
    const has = perms.some(p => req.user.permissions?.includes(p));
    if (!has) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
    }
    next();
  };
}

module.exports = { protect, restrictTo, requirePermission };
