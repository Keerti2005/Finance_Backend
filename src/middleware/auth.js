const jwt = require('jsonwebtoken');
const { Users } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'finance-dev-secret-change-in-prod';

/**
 * Verifies the JWT token in the Authorization header.
 * Attaches decoded user info to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validate user still exists and is active
    const user = Users.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Role-based access control factory.
 * Usage: authorize('admin') or authorize('admin', 'analyst')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
};

module.exports = { authenticate, authorize, generateToken };
