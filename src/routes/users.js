const express = require('express');
const { body, param } = require('express-validator');
const { Users } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const router = express.Router();

// All user management routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * Admin only — list all users
 */
router.get('/', authorize('admin'), (req, res) => {
  res.json(Users.findAll());
});

/**
 * GET /api/users/:id
 * Admin can get any user; others can only get themselves
 */
router.get('/:id', [param('id').notEmpty()], validate, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'You can only view your own profile' });
  }
  const user = Users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json(safe);
});

/**
 * PUT /api/users/:id
 * Admin can update any user. Users can update their own name/password only.
 */
router.put(
  '/:id',
  [
    param('id').notEmpty(),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('role').optional().isIn(['viewer', 'analyst', 'admin']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  ],
  validate,
  (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Non-admins cannot change role or status
    if (!isAdmin) {
      delete req.body.role;
      delete req.body.status;
      delete req.body.email;
    }

    const existing = Users.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Check email uniqueness if changing email
    if (req.body.email && req.body.email !== existing.email) {
      if (Users.findByEmail(req.body.email)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updated = Users.update(req.params.id, req.body);
    res.json({ message: 'User updated', user: updated });
  }
);

/**
 * DELETE /api/users/:id
 * Admin only — remove a user
 */
router.delete('/:id', authorize('admin'), (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: 'Admins cannot delete their own account' });
  }
  const deleted = Users.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
