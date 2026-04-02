const express = require('express');
const { body, param, query } = require('express-validator');
const { Records } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/records
 * All authenticated users — viewers, analysts, admins
 * Supports: ?type=income|expense &category=X &dateFrom=YYYY-MM-DD &dateTo=YYYY-MM-DD
 *           &search=text &page=1 &limit=20
 */
router.get(
  '/',
  [
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
    query('dateFrom').optional().isDate().withMessage('dateFrom must be YYYY-MM-DD'),
    query('dateTo').optional().isDate().withMessage('dateTo must be YYYY-MM-DD'),
  ],
  validate,
  (req, res) => {
    const result = Records.findAll(req.query);
    res.json(result);
  }
);

/**
 * GET /api/records/:id
 * All authenticated users
 */
router.get('/:id', [param('id').notEmpty()], validate, (req, res) => {
  const record = Records.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

/**
 * POST /api/records
 * Admin only — create a financial record
 */
router.post(
  '/',
  authorize('admin'),
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').isDate().withMessage('Date must be in YYYY-MM-DD format'),
    body('notes').optional().trim(),
  ],
  validate,
  (req, res) => {
    const { amount, type, category, date, notes } = req.body;
    const record = Records.create({ amount, type, category, date, notes, createdBy: req.user.id });
    res.status(201).json(record);
  }
);

/**
 * PUT /api/records/:id
 * Admin only — update a financial record
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    param('id').notEmpty(),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('date').optional().isDate().withMessage('Date must be YYYY-MM-DD'),
    body('notes').optional().trim(),
  ],
  validate,
  (req, res) => {
    const record = Records.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const updated = Records.update(req.params.id, req.body);
    res.json(updated);
  }
);

/**
 * DELETE /api/records/:id
 * Admin only — soft deletes the record (preserves data for audit trails)
 */
router.delete('/:id', authorize('admin'), (req, res) => {
  const record = Records.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  Records.softDelete(req.params.id);
  res.json({ message: 'Record deleted successfully' });
});

module.exports = router;
