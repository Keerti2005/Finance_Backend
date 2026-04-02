const { validationResult } = require('express-validator');

/**
 * Extracts express-validator errors and returns a 422 response if any exist.
 * Call this after your validation chain in each route.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * Global error handler — catches any unhandled errors from routes/services.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path} —`, err.message);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

/**
 * 404 handler for unmatched routes.
 */
const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

module.exports = { validate, errorHandler, notFound };
