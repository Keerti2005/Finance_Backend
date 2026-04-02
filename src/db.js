/**
 * In-memory data store simulating a database.
 * Assumption: Using in-memory storage for simplicity and portability.
 * In production, replace with a real DB (PostgreSQL, MySQL, SQLite, etc.)
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    id: 'user-admin-001',
    name: 'Alice Admin',
    email: 'admin@finance.dev',
    // password: admin123
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'user-analyst-002',
    name: 'Bob Analyst',
    email: 'analyst@finance.dev',
    // password: analyst123
    password: bcrypt.hashSync('analyst123', 10),
    role: 'analyst',
    status: 'active',
    createdAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'user-viewer-003',
    name: 'Carol Viewer',
    email: 'viewer@finance.dev',
    // password: viewer123
    password: bcrypt.hashSync('viewer123', 10),
    role: 'viewer',
    status: 'active',
    createdAt: '2025-01-03T00:00:00.000Z',
  },
];

const SEED_RECORDS = [
  {
    id: 'rec-001',
    amount: 50000,
    type: 'income',
    category: 'Salary',
    date: '2025-12-01',
    notes: 'Monthly salary',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2025-12-01T09:00:00.000Z',
    updatedAt: '2025-12-01T09:00:00.000Z',
  },
  {
    id: 'rec-002',
    amount: 1200,
    type: 'expense',
    category: 'Utilities',
    date: '2025-12-05',
    notes: 'Electricity bill',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2025-12-05T10:00:00.000Z',
    updatedAt: '2025-12-05T10:00:00.000Z',
  },
  {
    id: 'rec-003',
    amount: 8000,
    type: 'income',
    category: 'Freelance',
    date: '2025-12-10',
    notes: 'Website project payment',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2025-12-10T11:00:00.000Z',
    updatedAt: '2025-12-10T11:00:00.000Z',
  },
  {
    id: 'rec-004',
    amount: 3500,
    type: 'expense',
    category: 'Rent',
    date: '2025-12-15',
    notes: 'Monthly rent',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2025-12-15T08:00:00.000Z',
    updatedAt: '2025-12-15T08:00:00.000Z',
  },
  {
    id: 'rec-005',
    amount: 600,
    type: 'expense',
    category: 'Food',
    date: '2026-01-03',
    notes: 'Groceries',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2026-01-03T14:00:00.000Z',
    updatedAt: '2026-01-03T14:00:00.000Z',
  },
  {
    id: 'rec-006',
    amount: 25000,
    type: 'income',
    category: 'Salary',
    date: '2026-01-01',
    notes: 'January salary',
    isDeleted: false,
    createdBy: 'user-admin-001',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
  },
  {
    id: 'rec-007',
    amount: 2000,
    type: 'expense',
    category: 'Transport',
    date: '2026-01-10',
    notes: 'Flight tickets',
    isDeleted: true, // soft-deleted example
    createdBy: 'user-admin-001',
    createdAt: '2026-01-10T07:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
  },
];

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const db = {
  users: [...SEED_USERS],
  records: [...SEED_RECORDS],
};

// ─── User Helpers ─────────────────────────────────────────────────────────────

const Users = {
  findAll: () => db.users.map(({ password, ...u }) => u),

  findById: (id) => db.users.find((u) => u.id === id) || null,

  findByEmail: (email) => db.users.find((u) => u.email === email) || null,

  create: ({ name, email, password, role }) => {
    const hashed = bcrypt.hashSync(password, 10);
    const user = {
      id: uuidv4(),
      name,
      email,
      password: hashed,
      role: role || 'viewer',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    const { password: _, ...safe } = user;
    return safe;
  },

  update: (id, updates) => {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    if (updates.password) updates.password = bcrypt.hashSync(updates.password, 10);
    db.users[idx] = { ...db.users[idx], ...updates };
    const { password: _, ...safe } = db.users[idx];
    return safe;
  },

  delete: (id) => {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    db.users.splice(idx, 1);
    return true;
  },
};

// ─── Record Helpers ───────────────────────────────────────────────────────────

const Records = {
  findAll: (filters = {}, includeDeleted = false) => {
    let results = db.records.filter((r) => includeDeleted || !r.isDeleted);

    if (filters.type) results = results.filter((r) => r.type === filters.type);
    if (filters.category) results = results.filter((r) => r.category.toLowerCase().includes(filters.category.toLowerCase()));
    if (filters.dateFrom) results = results.filter((r) => r.date >= filters.dateFrom);
    if (filters.dateTo) results = results.filter((r) => r.date <= filters.dateTo);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((r) => r.notes?.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
    }

    // Sort by date desc by default
    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;
    const total = results.length;
    const data = results.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id) => db.records.find((r) => r.id === id && !r.isDeleted) || null,

  create: ({ amount, type, category, date, notes, createdBy }) => {
    const record = {
      id: uuidv4(),
      amount: parseFloat(amount),
      type,
      category,
      date,
      notes: notes || null,
      isDeleted: false,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.records.push(record);
    return record;
  },

  update: (id, updates) => {
    const idx = db.records.findIndex((r) => r.id === id && !r.isDeleted);
    if (idx === -1) return null;
    const allowed = ['amount', 'type', 'category', 'date', 'notes'];
    allowed.forEach((key) => {
      if (updates[key] !== undefined) db.records[idx][key] = updates[key];
    });
    if (updates.amount !== undefined) db.records[idx].amount = parseFloat(updates.amount);
    db.records[idx].updatedAt = new Date().toISOString();
    return db.records[idx];
  },

  softDelete: (id) => {
    const idx = db.records.findIndex((r) => r.id === id && !r.isDeleted);
    if (idx === -1) return false;
    db.records[idx].isDeleted = true;
    db.records[idx].updatedAt = new Date().toISOString();
    return true;
  },

  // For dashboard aggregations — no pagination, no deleted
  aggregate: (filters = {}) => {
    let results = db.records.filter((r) => !r.isDeleted);
    if (filters.dateFrom) results = results.filter((r) => r.date >= filters.dateFrom);
    if (filters.dateTo) results = results.filter((r) => r.date <= filters.dateTo);
    return results;
  },
};

module.exports = { Users, Records };
