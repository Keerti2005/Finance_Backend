const express = require('express');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recordRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan('dev'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
