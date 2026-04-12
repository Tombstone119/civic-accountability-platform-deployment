# Civic Accountability Platform

A full-stack transparency system for tracking government contracts, public spending, vendor compliance, and audit findings. Built to enable citizens, journalists, and oversight bodies to scrutinise how public funds are allocated.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Setup Instructions](#setup-instructions)
5. [Running the Application](#running-the-application)
6. [Default Credentials](#default-credentials)
7. [API Documentation](#api-documentation)
   - [Authentication](#authentication)
   - [Contracts](#contracts)
   - [Vendors](#vendors)
   - [Payments](#payments)
   - [Audits](#audits)
   - [Departments](#departments)
   - [Users](#users)
   - [Spending Summaries](#spending-summaries)
   - [Public Portal](#public-portal)
   - [Health Check](#health-check)
8. [Third-Party API Integration](#third-party-api-integration)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Project Structure](#project-structure)

---

## Architecture

```
civic-accountability-platform/
├── client/          # React + TypeScript (Vite)
└── server/          # Express + TypeScript (Node.js)
```

**Server request flow:**

```
Request → Rate Limiter → Auth Middleware → Role Middleware → Validators → Controller → Service → Model (MongoDB)
```

| Layer | Responsibility |
|---|---|
| **Routes** | Wire middleware chains, delegate to controllers |
| **Controllers** | Parse HTTP req/res, call services |
| **Services** | Business logic, throw typed errors |
| **Models** | Mongoose schemas backed by MongoDB |
| **Middleware** | JWT auth, RBAC roles, rate limiting, validation |

**Client:**
- React Router v6 with `AuthContext` for session state
- Single Axios instance in `client/src/services/api.ts` auto-attaches JWT and redirects on 401
- Vite proxy forwards `/api` to `localhost:5000` in development

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) v6 or higher (local or Atlas)
- npm v9 or higher

---

## Environment Variables

Create a `.env` file at the **monorepo root** (copy from `.env.example`):

```env
# Server
PORT=5000
JWT_SECRET=your_strong_secret_here

# MongoDB
MONGO_URI=mongodb://localhost:27017/civic_accountability

# Client (used by Vite)
VITE_API_URL=http://localhost:5000
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Express server port (default: 5000) |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens — use a long random string in production |
| `MONGO_URI` | Yes | MongoDB connection string |
| `VITE_API_URL` | Yes | Base URL for API calls from the React client |

> **Never commit `.env` to version control.** The `.env.example` file shows all required keys without values.

---

## Setup Instructions

**1. Clone the repository**

```bash
git clone https://github.com/Tombstone119/civic-accountability-platform.git
cd civic-accountability-platform
```

**2. Install all dependencies** (installs root, client, and server workspaces in one command)

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
# Open .env and set MONGO_URI and JWT_SECRET
```

**4. Start MongoDB**

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas — paste the connection string into MONGO_URI
```

**5. Seed the database** (optional but recommended — populates demo data for all 12 entities)

```bash
npm run seed --workspace=server
```

The seed script is idempotent — it checks for `admin@civic.gov` before inserting, so it is safe to run multiple times.

---

## Running the Application

### Development (hot-reload on both client and server)

```bash
npm run dev
```

- Client: [http://localhost:3000](http://localhost:3000)
- Server: [http://localhost:5000](http://localhost:5000)

### Run separately

```bash
npm run dev:client   # Vite dev server on port 3000
npm run dev:server   # ts-node-dev with hot-reload on port 5000
```

### Production

```bash
npm run build        # Compile TypeScript and bundle React
npm start            # Serve built output
```

---

## Default Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@civic.gov` | `admin123` |
| Procurement Officer | `officer@civic.gov` | `officer123` |
| Auditor | `auditor@civic.gov` | `auditor123` |
| Viewer | `viewer@civic.gov` | `viewer123` |

---

## API Documentation

All endpoints are prefixed with `/api`. Authenticated endpoints require a `Bearer` token in the `Authorization` header.

**Standard response envelopes:**

```json
// Success
{ "success": true, "data": { ... } }

// Paginated
{ "success": true, "data": [...], "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 } }

// Error
{ "success": false, "message": "Human-readable error", "errors": [...] }
```

**Role hierarchy:** `admin` > `procurement_officer` > `auditor` > `viewer`

---

### Authentication

Base path: `/api/auth`

#### POST `/api/auth/register`

Register a new user account.

- **Auth:** None
- **Rate limit:** 5 requests / 15 minutes

**Request body:**

```json
{
  "name": "Jane Smith",
  "email": "jane@civic.gov",
  "password": "secret123",
  "departmentId": "64abc..."
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "_id": "...", "name": "Jane Smith", "email": "jane@civic.gov", "role": "viewer" }
  }
}
```

---

#### POST `/api/auth/login`

Authenticate and receive a JWT.

- **Auth:** None
- **Rate limit:** 5 requests / 15 minutes

**Request body:**

```json
{ "email": "admin@civic.gov", "password": "admin123" }
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "_id": "...", "name": "Admin User", "role": "admin" }
  }
}
```

---

#### GET `/api/auth/profile`

Get the authenticated user's profile.

- **Auth:** Any authenticated role

**Response `200`:**

```json
{ "success": true, "data": { "_id": "...", "name": "Admin User", "email": "admin@civic.gov", "role": "admin" } }
```

---

#### PUT `/api/auth/profile`

Update the authenticated user's name or password.

- **Auth:** Any authenticated role

**Request body:**

```json
{
  "name": "Updated Name",
  "currentPassword": "old_password",
  "newPassword": "new_password123"
}
```

---

### Contracts

Base path: `/api/contracts`
Auth required for all routes.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | All | List contracts (paginated). Query: `page`, `limit`, `status`, `department`, `vendor`, `search` |
| `POST` | `/` | officer+ | Create a contract |
| `GET` | `/:id` | All | Get contract by ID |
| `PUT` | `/:id` | officer+ | Update a contract |
| `DELETE` | `/:id` | admin | Delete a draft contract |
| `POST` | `/:id/publish` | officer+ | Publish contract to Public Portal |
| `GET` | `/:id/items` | All | List contract line items |
| `POST` | `/:id/items` | officer+ | Add a line item |
| `PUT` | `/:id/items/:itemId` | officer+ | Update a line item |
| `DELETE` | `/:id/items/:itemId` | admin | Delete a line item |
| `GET` | `/:id/payments` | officer+ | List payments for a contract |

**Create contract — request body:**

```json
{
  "contractNo": "CON-2024-001",
  "title": "Road Resurfacing Project",
  "description": "Resurfacing of main highway",
  "vendor": "64abc123...",
  "department": "64def456...",
  "contractValue": 2500000,
  "startDate": "2024-01-15",
  "endDate": "2024-12-31",
  "procurementMethod": "open_tender",
  "status": "active",
  "category": "Infrastructure"
}
```

---

### Vendors

Base path: `/api/vendors`
Auth required for all routes.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | All | List vendors. Query: `search`, `isBlacklisted`, `isActive`, `category`, `page`, `limit` |
| `POST` | `/` | officer+ | Register a vendor |
| `GET` | `/:id` | All | Get vendor with documents and contract count |
| `PUT` | `/:id` | officer+ | Update vendor details |
| `DELETE` | `/:id` | admin | Delete vendor (blocked if non-draft contracts exist) |
| `POST` | `/:id/blacklist` | admin | Blacklist a vendor |
| `DELETE` | `/:id/blacklist` | admin | Remove from blacklist |
| `GET` | `/:id/documents` | officer+ | List compliance documents |
| `POST` | `/:id/documents` | officer+ | Add a compliance document |
| `PUT` | `/:id/documents/:docId` | officer+ | Update a document (e.g. mark verified) |
| `DELETE` | `/:id/documents/:docId` | admin | Remove a document |

**Register vendor — request body:**

```json
{
  "name": "ABC Construction Co.",
  "registrationNo": "REG-001",
  "email": "contact@abcconstruction.com",
  "phone": "+94-11-234-5678",
  "address": "12 Builder Lane, Colombo 3",
  "category": "Construction"
}
```

**Blacklist — request body:**

```json
{ "reason": "Fraud detected on contract CON-2023-007" }
```

---

### Payments

Base path: `/api/payments`
Auth required for all routes.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | officer+ | List all payments (paginated). Query: `contract`, `status`, `page`, `limit` |
| `POST` | `/` | officer+ | Record a payment |
| `GET` | `/:id` | officer+ | Get payment by ID |
| `PUT` | `/:id` | officer+ | Update payment (status, notes, referenceNo) |
| `DELETE` | `/:id` | admin | Delete a payment |

**Record payment — request body:**

```json
{
  "contract": "64abc123...",
  "amount": 500000,
  "paymentDate": "2024-03-01",
  "paymentMethod": "bank_transfer",
  "referenceNo": "TXN-2024-001",
  "notes": "First instalment",
  "status": "completed"
}
```

---

### Audits

Base path: `/api/audits`
Auth required for all routes.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | auditor+ | List all audits (paginated) |
| `POST` | `/` | auditor+ | Create an audit |
| `GET` | `/:id` | auditor+ | Get audit by ID |
| `PUT` | `/:id` | auditor+ | Update audit (status, risk rating, compliance) |
| `DELETE` | `/:id` | admin | Delete an audit |
| `GET` | `/:id/findings` | auditor+ | List findings for an audit |
| `POST` | `/:id/findings` | auditor+ | Add a finding |
| `PUT` | `/:id/findings/:findingId` | auditor+ | Update a finding |
| `DELETE` | `/:id/findings/:findingId` | admin | Delete a finding |

**Create audit — request body:**

```json
{
  "auditType": "forensic",
  "contract": "64abc123...",
  "vendor": "64def456...",
  "startDate": "2024-02-01",
  "endDate": "2024-02-28",
  "summary": "Suspected overpricing on line items."
}
```

**Add finding — request body:**

```json
{
  "findingType": "overpricing",
  "severity": "high",
  "description": "Unit price for chairs is 3× market rate.",
  "evidence": "Market survey attached.",
  "recommendation": "Renegotiate contract and recover excess."
}
```

---

### Departments

Base path: `/api/departments`
Auth required for all routes.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | All | List all departments |
| `POST` | `/` | admin | Create a department |
| `GET` | `/:id` | All | Get department by ID |
| `PUT` | `/:id` | admin | Update department details |
| `DELETE` | `/:id` | admin | Delete a department |

---

### Users

Base path: `/api/users`
Admin-only management endpoints.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | admin | List all users |
| `GET` | `/:id` | admin | Get user by ID |
| `PUT` | `/:id` | admin | Update user role, status, or department |
| `DELETE` | `/:id` | admin | Deactivate or delete a user |

---

### Spending Summaries

Base path: `/api/spending`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | List all spending summaries |
| `GET` | `/summary` | None | Aggregated spending summary |
| `GET` | `/department/:department` | None | Summaries for a specific department |
| `GET` | `/:id` | None | Get summary by ID |
| `POST` | `/refresh-summary` | admin | Re-aggregate live data and upsert summaries. Body: `{ "fiscalYear": 2024 }` |
| `POST` | `/` | admin | Create a spending record |
| `PUT` | `/:id` | admin | Update a spending record |
| `DELETE` | `/:id` | admin | Delete a spending record |

---

### Public Portal

Base path: `/api/public`
**No authentication required** unless noted — designed for citizen access.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/records` | None | Paginated list of published contract records. Query: `q`, `tags`, `page`, `limit` |
| `GET` | `/records/:id` | None | Single public record (increments view count) |
| `POST` | `/records/:id/comments` | None | Submit a citizen comment (starts as pending) |
| `GET` | `/records/:id/comments` | None | Approved comments for a record |
| `PUT` | `/comments/:id/moderate` | admin | Approve, reject, or flag a comment |
| `GET` | `/currencies` | None | List currencies supported for conversion (Frankfurter API) |
| `GET` | `/records/:id/convert` | None | Convert a contract value to another currency |

See [Third-Party API Integration](#third-party-api-integration) for full details on the last two endpoints.

**Submit comment — request body:**

```json
{
  "authorName": "John Citizen",
  "content": "This contract appears to be overpriced compared to market rates.",
  "authorEmail": "john@example.com",
  "isAnonymous": false,
  "isWhistleblower": false
}
```

**Moderate comment — request body:**

```json
{ "status": "approved" }
```

---

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Server liveness check |

**Response `200`:**

```json
{ "success": true, "message": "Server is running" }
```

---

## Third-Party API Integration

The Public Portal integrates with **[Frankfurter](https://www.frankfurter.app/)** — an open-source, free, no-auth exchange rate API — to allow citizens and journalists to view government contract values in their local currency.

### GET `/api/public/currencies`

Returns all currencies supported by the Frankfurter API. Results are cached server-side for **24 hours** to minimise external requests.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "AUD": "Australian Dollar",
    "EUR": "Euro",
    "GBP": "British Pound",
    "JPY": "Japanese Yen",
    "USD": "US Dollar"
  },
  "meta": {
    "source": "Frankfurter (https://www.frankfurter.app)",
    "cachedFor": "24 hours"
  }
}
```

---

### GET `/api/public/records/:id/convert?to=EUR&from=USD`

Fetches a published public record and converts the underlying contract value to the requested currency using a live exchange rate from Frankfurter.

**Query parameters:**

| Parameter | Required | Default | Description |
|---|---|---|---|
| `to` | Yes | — | Target currency code (e.g. `EUR`, `GBP`, `JPY`) |
| `from` | No | `USD` | Source currency code |

**Example:**

```
GET /api/public/records/64abc123.../convert?to=EUR&from=USD
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "recordId": "64abc123...",
    "title": "Road Resurfacing Project",
    "conversion": {
      "originalAmount": 2500000,
      "from": "USD",
      "to": "EUR",
      "rate": 0.921,
      "convertedAmount": 2302500,
      "rateDate": "2025-02-27"
    }
  }
}
```

**Error `400` — invalid currency code:**

```json
{
  "success": false,
  "message": "Invalid currency code: 'XYZ'. Use GET /api/public/currencies to see supported codes."
}
```

**External API used:** `https://api.frankfurter.app/latest?amount=<n>&from=<FROM>&to=<TO>`

---

## Deployment

### Backend Deployment (Render / Railway)

1. Push repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Set the build command: `npm install && npm run build`
4. Set the start command: `npm start`
5. Add environment variables in the platform dashboard:
   - `PORT`
   - `JWT_SECRET`
   - `MONGO_URI` (use a MongoDB Atlas connection string)
   - `VITE_API_URL`

### Frontend Deployment (Vercel / Netlify)

1. Connect the repository to [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com).
2. Set the **root directory** to `client/`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set the environment variable `VITE_API_URL` to the deployed backend URL.

### Live URLs

| Service | URL |
|---|---|
| Backend API | *(to be updated after deployment)* |
| Frontend App | *(to be updated after deployment)* |

---

## Testing

### 1. Unit Testing

Unit tests cover individual service functions and utility helpers.

**Framework:** [Jest](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/)

**Install:**

```bash
npm install --save-dev jest ts-jest @types/jest
```

**Run:**

```bash
npm test --workspace=server
```

Tests are located in `server/src/__tests__/`. Example:

```
server/src/__tests__/
├── services/
│   ├── contractService.test.ts
│   ├── vendorService.test.ts
│   └── currencyService.test.ts
└── utils/
    └── errors.test.ts
```

---

### 2. Integration Testing

Integration tests verify that controllers, services, and MongoDB work end-to-end.

**Framework:** [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) + [MongoMemoryServer](https://github.com/nodkz/mongodb-memory-server)

**Install:**

```bash
npm install --save-dev supertest @types/supertest mongodb-memory-server
```

**Run:**

```bash
npm run test:integration --workspace=server
```

Example integration test structure:

```typescript
// contracts.test.ts
describe('POST /api/contracts', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/contracts').send({ ... });
    expect(res.status).toBe(401);
  });

  it('creates a contract when officer token provided', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ ... });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

---

### 3. Performance Testing

Performance tests evaluate API throughput and response times under load.

**Tool:** [Artillery](https://www.artillery.io/)

**Install:**

```bash
npm install --save-dev artillery
```

**Run:**

```bash
npx artillery run tests/performance/load-test.yml
```

Example `load-test.yml`:

```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 20
      name: "Sustained load"

scenarios:
  - name: "Public portal read"
    flow:
      - get:
          url: "/api/public/records"
      - get:
          url: "/api/public/currencies"
```

---

## Project Structure

```
civic-accountability-platform/
├── client/                        # React + TypeScript frontend
│   └── src/
│       ├── components/            # Reusable UI components
│       ├── context/               # AuthContext (session management)
│       ├── hooks/                 # Custom React hooks
│       ├── pages/                 # Page components (Home, Contracts, Spending, Login)
│       ├── services/              # Axios API client
│       └── types/                 # TypeScript interfaces
│
├── server/                        # Express + TypeScript backend
│   └── src/
│       ├── config/                # DB connection, environment config
│       ├── controllers/           # HTTP request handlers
│       ├── middleware/            # auth, roles, validation, rate-limiting, errors
│       ├── models/                # Mongoose schemas (12 models)
│       ├── routes/                # Express routers
│       ├── services/              # Business logic + third-party integrations
│       │   └── currencyService.ts # Frankfurter exchange rate API
│       ├── types/                 # Shared TypeScript types
│       └── utils/                 # errors, enums, seed script
│
├── docs/                          # Specification and planning docs
├── .env.example                   # Environment variable template
├── package.json                   # Workspace root
└── README.md
```

---

## Security Features

- **JWT authentication** — tokens signed with `JWT_SECRET`, verified on every protected route
- **bcryptjs** — passwords hashed with salt rounds before storage
- **RBAC** — four roles (`admin`, `procurement_officer`, `auditor`, `viewer`) enforced at route level
- **Rate limiting** — auth endpoints: 5 req/15min; reads: 100 req/15min; writes: 20 req/15min
- **Input validation** — `express-validator` on every write endpoint
- **CORS** — configured to allow only the frontend origin

---

## License

ISC
