# Finance Data Processing and Access Control Backend

A clean, well-structured REST API backend for a finance dashboard system. Built with **Node.js + Express**, using an **in-memory data store** for portability and ease of evaluation.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup and Running](#setup-and-running)
- [Assumptions and Design Decisions](#assumptions-and-design-decisions)
- [Role Model](#role-model)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Users](#users)
  - [Records](#records)
  - [Dashboard](#dashboard)
- [Access Control Matrix](#access-control-matrix)
- [Error Handling](#error-handling)
- [Running Tests](#running-tests)
- [Tradeoffs and Notes](#tradeoffs-and-notes)

---

## Tech Stack

| Layer        | Choice                         | Reason                                            |
|--------------|-------------------------------|---------------------------------------------------|
| Runtime      | Node.js                        | Fast, widely used for REST APIs                   |
| Framework    | Express.js                     | Minimal, flexible, well-understood                |
| Auth         | JWT (jsonwebtoken)             | Stateless, easy to test and evaluate              |
| Passwords    | bcryptjs                       | Industry-standard password hashing                |
| Validation   | express-validator              | Declarative, integrates cleanly with Express      |
| Storage      | In-memory (JavaScript objects) | Portable, no DB setup needed for evaluation       |
| Testing      | Jest + Supertest               | Standard Node.js testing stack                    |

---

## Project Structure

```
finance-backend/
├── index.js                  # Server entry point
├── src/
│   ├── app.js                # Express app setup and route mounting
│   ├── db.js                 # In-memory data store + CRUD helpers
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication + role authorization
│   │   └── error.js          # Validation middleware + global error handler
│   └── routes/
│       ├── auth.js           # Login, register, /me
│       ├── users.js          # User management (CRUD)
│       ├── records.js        # Financial records (CRUD + filtering)
│       └── dashboard.js      # Summary, trends, recent, category breakdown
├── tests/
│   └── api.test.js           # Integration tests (19 test cases)
├── package.json
└── README.md
```

---

## Setup and Running

### Prerequisites

- Node.js v16+ installed

### Install dependencies

```bash
npm install
```

### Start the server

```bash
npm start
```

The server starts on `http://localhost:3000`.

### Development mode (auto-restart on file changes)

```bash
npm run dev
```

### Seeded test users (available immediately on start)

| Email                    | Password    | Role     |
|--------------------------|-------------|----------|
| admin@finance.dev        | admin123    | admin    |
| analyst@finance.dev      | analyst123  | analyst  |
| viewer@finance.dev       | viewer123   | viewer   |

---

## Assumptions and Design Decisions

1. **In-memory storage**: No database setup required for this evaluation. Data resets on server restart. In production, this layer would be replaced with a real database (PostgreSQL or SQLite recommended). The `db.js` file is designed so that its `Users` and `Records` objects can be swapped for ORM/query calls with minimal changes to the route layer.

2. **No public signup**: In a finance system, user accounts should be created by an admin, not self-registered. The `/api/auth/register` endpoint exists but is intentionally not gated behind authentication here so evaluators can create new users without needing an existing admin session. In production, it would require admin authentication.

3. **Soft deletes for records**: Financial records are never hard-deleted. The `isDeleted` flag preserves the audit trail — important in any financial system. Soft-deleted records are excluded from all read and aggregation queries by default.

4. **JWT expiry at 8 hours**: Reasonable for a business day session.

5. **Amounts stored as floats**: Simple and practical for this scope. In production with real money, amounts would be stored as integers (cents/paise) to avoid floating-point issues.

6. **Pagination defaults**: Page size defaults to 20. Maximum is capped at 100 per request.

7. **Viewer role and dashboard/recent**: Viewers can access `/api/dashboard/recent` as a minimal read-only overview. Full analytics (summary, trends, breakdown) are restricted to analyst and admin roles.

---

## Role Model

| Role     | Description                                              |
|----------|----------------------------------------------------------|
| viewer   | Read-only access to records and recent activity          |
| analyst  | All viewer access + full dashboard analytics             |
| admin    | Full access: create/update/delete records, manage users  |

---

## API Reference

All protected endpoints require:

```
Authorization: Bearer <your_jwt_token>
```

---

### Auth

#### `POST /api/auth/login`

Authenticate and receive a JWT token.

**Request body:**
```json
{
  "email": "admin@finance.dev",
  "password": "admin123"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user-admin-001",
    "name": "Alice Admin",
    "email": "admin@finance.dev",
    "role": "admin"
  }
}
```

**Errors:** `401` invalid credentials, `422` validation failure

---

#### `POST /api/auth/register`

Create a new user account.

**Request body:**
```json
{
  "name": "Dave New",
  "email": "dave@finance.dev",
  "password": "securepassword",
  "role": "viewer"
}
```

**Response `201`:** Created user object (no password field)

**Errors:** `409` email already in use, `422` validation failure

---

#### `GET /api/auth/me` 🔒

Returns the currently authenticated user's profile.

**Response `200`:** User object

---

### Users

#### `GET /api/users` 🔒 Admin only

List all users.

**Response `200`:** Array of user objects

---

#### `GET /api/users/:id` 🔒 Admin (any), Others (self only)

Get a user by ID.

**Response `200`:** User object  
**Errors:** `403` unauthorized, `404` not found

---

#### `PUT /api/users/:id` 🔒 Admin (any), Others (self only — name/password)

Update a user. Admins may update role, status, and email. Non-admins may only update name and password.

**Request body (all fields optional):**
```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "password": "newpassword",
  "role": "analyst",
  "status": "inactive"
}
```

**Response `200`:** Updated user object

---

#### `DELETE /api/users/:id` 🔒 Admin only

Delete a user. Admins cannot delete their own account.

**Response `200`:** `{ "message": "User deleted" }`

---

### Records

#### `GET /api/records` 🔒 All roles

List financial records with optional filters and pagination.

**Query parameters:**

| Param      | Type   | Description                       |
|------------|--------|-----------------------------------|
| type       | string | `income` or `expense`             |
| category   | string | Partial match on category name    |
| dateFrom   | string | `YYYY-MM-DD` start date filter    |
| dateTo     | string | `YYYY-MM-DD` end date filter      |
| search     | string | Search in notes and category      |
| page       | int    | Page number (default: 1)          |
| limit      | int    | Results per page (default: 20)    |

**Response `200`:**
```json
{
  "data": [...],
  "total": 6,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

#### `GET /api/records/:id` 🔒 All roles

Get a single record by ID.

**Response `200`:** Record object  
**Errors:** `404` not found (or soft-deleted)

---

#### `POST /api/records` 🔒 Admin only

Create a new financial record.

**Request body:**
```json
{
  "amount": 5000.00,
  "type": "income",
  "category": "Freelance",
  "date": "2026-03-15",
  "notes": "Website design project"
}
```

**Response `201`:** Created record object

**Errors:** `403` insufficient role, `422` validation failure

---

#### `PUT /api/records/:id` 🔒 Admin only

Update an existing record. All fields are optional.

**Request body:**
```json
{
  "amount": 5500.00,
  "notes": "Updated amount after invoice"
}
```

**Response `200`:** Updated record object

---

#### `DELETE /api/records/:id` 🔒 Admin only

Soft-delete a record. The record is flagged as deleted and excluded from all queries, but not permanently removed.

**Response `200`:** `{ "message": "Record deleted successfully" }`

---

### Dashboard

#### `GET /api/dashboard/summary` 🔒 Analyst, Admin

Returns aggregated totals. Accepts optional `dateFrom` / `dateTo` filters.

**Response `200`:**
```json
{
  "totalIncome": 83000,
  "totalExpenses": 7300,
  "netBalance": 75700,
  "byCategory": {
    "Salary": { "income": 75000, "expense": 0 },
    "Utilities": { "income": 0, "expense": 1200 }
  },
  "recordCount": 6,
  "filters": { "dateFrom": null, "dateTo": null }
}
```

---

#### `GET /api/dashboard/trends` 🔒 Analyst, Admin

Monthly income vs expense trend for the past N months.

**Query parameters:**

| Param  | Type | Description                     |
|--------|------|---------------------------------|
| months | int  | Number of months (default: 6)   |

**Response `200`:**
```json
{
  "trends": [
    { "month": "2025-10", "income": 0, "expenses": 0, "net": 0 },
    { "month": "2025-12", "income": 58000, "expenses": 4700, "net": 53300 },
    { "month": "2026-01", "income": 25000, "expenses": 600, "net": 24400 }
  ],
  "months": 6
}
```

---

#### `GET /api/dashboard/recent` 🔒 All roles

Returns the most recent N financial records.

**Query parameters:**

| Param | Type | Description                    |
|-------|------|--------------------------------|
| limit | int  | Number of records (default: 5) |

**Response `200`:**
```json
{
  "recent": [...],
  "count": 5
}
```

---

#### `GET /api/dashboard/category-breakdown` 🔒 Analyst, Admin

Percentage breakdown by category.

**Query parameters:**

| Param | Type   | Description                           |
|-------|--------|---------------------------------------|
| type  | string | Filter by `income`, `expense`, or all |

**Response `200`:**
```json
{
  "breakdown": [
    { "category": "Salary", "amount": 75000, "percentage": 90.36 },
    { "category": "Freelance", "amount": 8000, "percentage": 9.64 }
  ],
  "total": 83000,
  "type": "income"
}
```

---

## Access Control Matrix

| Endpoint                             | Viewer | Analyst | Admin |
|--------------------------------------|--------|---------|-------|
| `POST /api/auth/login`               | ✅      | ✅       | ✅     |
| `GET /api/auth/me`                   | ✅      | ✅       | ✅     |
| `GET /api/users`                     | ❌      | ❌       | ✅     |
| `GET /api/users/:id` (own profile)   | ✅      | ✅       | ✅     |
| `PUT /api/users/:id` (own profile)   | ✅      | ✅       | ✅     |
| `DELETE /api/users/:id`              | ❌      | ❌       | ✅     |
| `GET /api/records`                   | ✅      | ✅       | ✅     |
| `GET /api/records/:id`               | ✅      | ✅       | ✅     |
| `POST /api/records`                  | ❌      | ❌       | ✅     |
| `PUT /api/records/:id`               | ❌      | ❌       | ✅     |
| `DELETE /api/records/:id`            | ❌      | ❌       | ✅     |
| `GET /api/dashboard/recent`          | ✅      | ✅       | ✅     |
| `GET /api/dashboard/summary`         | ❌      | ✅       | ✅     |
| `GET /api/dashboard/trends`          | ❌      | ✅       | ✅     |
| `GET /api/dashboard/category-breakdown` | ❌  | ✅       | ✅     |

*\* Non-admins can only update their own name and password — not role, status, or email.*

---

## Error Handling

All errors follow a consistent JSON shape:

```json
{ "error": "Human-readable error message" }
```

Validation errors return `422` with field-level detail:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Amount must be a positive number" },
    { "field": "date", "message": "Date must be in YYYY-MM-DD format" }
  ]
}
```

### HTTP Status Codes Used

| Code | Meaning                              |
|------|--------------------------------------|
| 200  | Success                              |
| 201  | Resource created                     |
| 400  | Bad request (e.g. malformed JSON)    |
| 401  | Not authenticated                    |
| 403  | Authenticated but insufficient role  |
| 404  | Resource not found                   |
| 409  | Conflict (e.g. duplicate email)      |
| 422  | Validation failure                   |
| 500  | Unexpected server error              |

---

## Running Tests

```bash
npm test
```

19 integration tests covering:
- Authentication (valid login, wrong password, missing fields)
- Role-based access control (403 responses for unauthorized roles)
- Record CRUD operations and validation
- Dashboard endpoint access control
- Filtering, pagination
- Health check

---

## Tradeoffs and Notes

**In-memory vs real database**: The storage layer is intentionally isolated in `src/db.js`. All route handlers interact only with the `Users` and `Records` helper objects — swapping this for Prisma, Sequelize, or raw SQL queries would not require changes in the route or middleware files.

**Password hashing at seed time**: The seed users have pre-hashed passwords to avoid rehashing on every server start.

**No rate limiting**: Adding express-rate-limit would be straightforward and is a noted production consideration.

**JWT stored on client**: This implementation returns the token to the client; storing it in an HttpOnly cookie would be more secure in a real browser-facing app.

**Soft deletes only for records**: Users are hard-deleted. Records are soft-deleted because financial data should never be permanently erased — it maintains an audit trail.
