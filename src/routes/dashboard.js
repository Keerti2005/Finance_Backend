const express = require('express');
const { query } = require('express-validator');
const { Records } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');

const router = express.Router();

// Dashboard routes require authentication; analysts and admins can access insights
router.use(authenticate);

/**
 * GET /api/dashboard/summary
 * Analysts + Admins
 * Returns: total income, total expenses, net balance, category-wise totals
 * Optional filters: ?dateFrom=YYYY-MM-DD &dateTo=YYYY-MM-DD
 */
router.get(
  '/summary',
  authorize('analyst', 'admin'),
  [
    query('dateFrom').optional().isDate().withMessage('dateFrom must be YYYY-MM-DD'),
    query('dateTo').optional().isDate().withMessage('dateTo must be YYYY-MM-DD'),
  ],
  validate,
  (req, res) => {
    const records = Records.aggregate({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });

    let totalIncome = 0;
    let totalExpenses = 0;
    const byCategory = {};

    for (const r of records) {
      if (r.type === 'income') totalIncome += r.amount;
      else totalExpenses += r.amount;

      if (!byCategory[r.category]) byCategory[r.category] = { income: 0, expense: 0 };
      byCategory[r.category][r.type] += r.amount;
    }

    res.json({
      totalIncome: round(totalIncome),
      totalExpenses: round(totalExpenses),
      netBalance: round(totalIncome - totalExpenses),
      byCategory,
      recordCount: records.length,
      filters: { dateFrom: req.query.dateFrom || null, dateTo: req.query.dateTo || null },
    });
  }
);

/**
 * GET /api/dashboard/trends
 * Analysts + Admins
 * Returns: monthly breakdown of income vs expenses for the past N months
 * Optional: ?months=6 (default 6)
 */
router.get(
  '/trends',
  authorize('analyst', 'admin'),
  [query('months').optional().isInt({ min: 1, max: 24 }).withMessage('months must be 1–24')],
  validate,
  (req, res) => {
    const numMonths = parseInt(req.query.months) || 6;

    // Build a list of the last N month keys (YYYY-MM)
    const monthKeys = [];
    const today = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const buckets = {};
    for (const key of monthKeys) {
      buckets[key] = { month: key, income: 0, expenses: 0, net: 0 };
    }

    const records = Records.aggregate();
    for (const r of records) {
      const monthKey = r.date.slice(0, 7); // "YYYY-MM"
      if (buckets[monthKey]) {
        if (r.type === 'income') buckets[monthKey].income += r.amount;
        else buckets[monthKey].expenses += r.amount;
      }
    }

    const trends = monthKeys.map((key) => {
      const b = buckets[key];
      return { ...b, income: round(b.income), expenses: round(b.expenses), net: round(b.income - b.expenses) };
    });

    res.json({ trends, months: numMonths });
  }
);

/**
 * GET /api/dashboard/recent
 * All authenticated users (viewers included — read-only overview)
 * Returns the N most recent non-deleted records
 * Optional: ?limit=5 (default 5)
 */
router.get(
  '/recent',
  [query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50')],
  validate,
  (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const { data } = Records.findAll({ limit, page: 1 });
    res.json({ recent: data, count: data.length });
  }
);

/**
 * GET /api/dashboard/category-breakdown
 * Analysts + Admins
 * Returns percentage breakdown by category for a given type (income or expense)
 */
router.get(
  '/category-breakdown',
  authorize('analyst', 'admin'),
  [query('type').optional().isIn(['income', 'expense']).withMessage('type must be income or expense')],
  validate,
  (req, res) => {
    const type = req.query.type || null;
    const records = Records.aggregate().filter((r) => !type || r.type === type);

    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const categoryMap = {};

    for (const r of records) {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
    }

    const breakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount: round(amount),
        percentage: total > 0 ? round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ breakdown, total: round(total), type: type || 'all' });
  }
);

// Helper
function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = router;
