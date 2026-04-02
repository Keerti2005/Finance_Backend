const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const { Users } = require('../db');
const { generateToken } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public — returns JWT token
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  (req, res) => {
    const { email, password } = req.body;
    const user = Users.findByEmail(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Contact an admin.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }
);

/**
 * POST /api/auth/register
 * Admin only — admins create user accounts
 * (Not a public signup; finance systems require controlled access)
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin'),
  ],
  validate,
  (req, res) => {
    const { name, email, password, role } = req.body;

    if (Users.findByEmail(email)) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const user = Users.create({ name, email, password, role });
    res.status(201).json({ message: 'User created successfully', user });
  }
);

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile
 */
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const user = Users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json(safe);
});

module.exports = router;
