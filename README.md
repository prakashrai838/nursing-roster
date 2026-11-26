# NurseRoster

NurseRoster is a staff scheduling application for hospital teams. It includes a dashboard, weekly shift roster, staff directory, shift templates, departments, and leave requests. Data is stored centrally in PostgreSQL and accessed through an authenticated API.

## Features

- Dashboard for today's shifts, staff counts, and pending leave
- Weekly roster with department filters and shift assignment
- Staff records for RN, LPN, CNA, and Charge Nurse
- Configurable shift templates and departments
- Leave submission, approval, and rejection tracking
- PostgreSQL persistence, authentication, roles, validation, and audit history

## Roles

| Role | Access |
| --- | --- |
| `admin` | View and edit roster data, create accounts, read audit history |
| `scheduler` | View and edit roster data |
| `nurse` | Read their own roster and leave requests; submit or withdraw their own pending leave requests |

Roster and staff changes are allowed only to `admin` and `scheduler` accounts. Nurse accounts are scoped to the staff profile linked to their email, and cannot read other staff records or leave reasons. The API checks roles and record ownership on every protected request; client-side checks do not grant access.

## Requirements

- Node.js 22 or later
- PostgreSQL 13 or later
- TLS enabled for production database connections

## Local setup

1. Install dependencies: `npm ci`
2. Create a PostgreSQL database and set the environment values in `.env` using `.env.example` as a guide.
3. Apply the schema: `npm run db:migrate`
4. Start the API: `npm start`

On the first application start, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create the first administrator. The initial password must be at least 12 characters. The first run also seeds the sample departments, shift templates, and staff used by the original demo. Remove or replace sample data before using a real organization.

For local frontend development, run `npm run dev` in a second terminal. Vite proxies `/api` requests to `http://localhost:3000`. Set `DATABASE_SSL=false` only for local development databases. `SESSION_SECRET` must be a unique random value at least 32 bytes long; generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.

## API

All API responses use JSON except `204 No Content`. Sessions use an eight-hour, signed JWT held in an `HttpOnly`, `SameSite=Strict` cookie. Passwords are hashed with bcrypt. Sign-in is rate limited. Protected endpoints require an active account, and write endpoints check the user's role.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Liveness and database readiness |
| `POST` | `/api/auth/login` | Public, rate limited | Start a session |
| `GET` | `/api/auth/me` | Signed-in | Read current account |
| `POST` | `/api/auth/logout` | Signed-in | Clear session cookie |
| `GET` | `/api/state` | Signed-in | Read roster state |
| `PUT` | `/api/state` | Admin, scheduler | Validate and save roster state |
| `POST` | `/api/leave` | Signed-in | Submit a pending leave request (nurse accounts may request only for themselves) |
| `DELETE` | `/api/leave/:id` | Owner, admin, scheduler | Withdraw own pending request or remove a request as manager |
| `GET` | `/api/users` | Admin | List accounts |
| `POST` | `/api/users` | Admin | Create an account |
| `PATCH` | `/api/users/:id` | Admin | Change role, reset password, or deactivate an account |
| `GET` | `/api/audit?limit=50` | Admin | Read recent audit events (max 100) |

Create an account with `POST /api/users` and JSON such as `{"email":"scheduler@example.org","password":"use-a-long-unique-passphrase","role":"scheduler"}`. A `nurse` account must use the same email as a staff profile. Passwords must contain at least 12 characters. `PATCH /api/users/:id` accepts one or more of `role`, `active`, and `password`; account changes invalidate existing sessions. The last active administrator cannot be demoted or deactivated. Duplicate emails return `409`; invalid data returns `400`; missing sessions return `401`; insufficient roles return `403`. Audit entries record authentication and roster changes, actor, timestamps, source IP, and collection counts. They deliberately do not copy leave reasons or staff records into the audit log.

Roster documents are stored in PostgreSQL `JSONB`; account and audit records use relational tables. API validation checks allowed fields, types, bounds, email formats, date ranges, unique records, and references before writing. Each roster update and its audit event commit in the same transaction.

## Production deployment

1. Provision PostgreSQL 13+ with private network access, TLS, encrypted storage, automated backups, and a tested restore procedure. Use a dedicated least-privilege application database role.
2. Build the Docker image from this repository and run it with `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The initial account variables are used only when the database has no users.
3. Publish the container behind a TLS-terminating reverse proxy. Set `APP_ORIGIN` to the exact public HTTPS origin (for example `https://roster.example.org`). Set `TRUST_PROXY=true` only when requests always pass through the trusted proxy.
4. Provide secrets through the host's secret manager. Never commit `.env` files, passwords, database URLs, or session keys.
5. Configure monitoring against `/api/health`, retain logs securely, and verify backup restoration before onboarding staff. Set `DB_POOL_SIZE` to a value compatible with the database connection limit.

The container runs database schema migrations on startup. Coordinate deployments to one application instance during schema changes. Production cookies are marked `Secure`; the app refuses to start if database TLS is not enabled or the session secret is missing/too short. Do not expose the database publicly. Use an organization-approved retention policy for audit events and staff data. Do not enter patient-identifying or clinical information into staff notes or leave reasons.

## Build, lint, and tests

```sh
npm test
npm run lint
npm run build
npm start
```

The production build compiles TypeScript and emits the static client into `dist/`. The production server serves that client and the API from the same origin.

## Project structure

```
src/       React application and existing scheduling screens
server/    Express API, auth, PostgreSQL schema, and validation tests
```
