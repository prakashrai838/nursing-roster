import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { stateSchema, loginSchema, leaveInputSchema, userSchema, userUpdateSchema, visibleStateForUser } from './validation.mjs';

const { Pool } = pg;
const app = express();
const production = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.SESSION_SECRET;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. See .env.example.');
if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
if (production && process.env.DATABASE_SSL !== 'true') throw new Error('DATABASE_SSL=true is required in production.');
if (production) {
  try { const origin = new URL(process.env.APP_ORIGIN); if (origin.protocol !== 'https:' || origin.origin !== process.env.APP_ORIGIN) throw new Error(); }
  catch { throw new Error('APP_ORIGIN must be the exact public HTTPS origin (for example https://roster.example.org).'); }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined, max: Number(process.env.DB_POOL_SIZE || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
const cookieName = 'nursing_roster_session';
const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 };

const initialState = {
  departments: [
    { id: 'dept-1', name: 'Emergency', description: 'Emergency Department' }, { id: 'dept-2', name: 'ICU', description: 'Intensive Care Unit' }, { id: 'dept-3', name: 'Medical Ward', description: 'General Medical Ward' }, { id: 'dept-4', name: 'Surgical Ward', description: 'Post-operative care' }, { id: 'dept-5', name: 'Pediatrics', description: 'Pediatric care unit' },
  ],
  shiftTemplates: [
    { id: 'shift-1', name: 'Morning', type: 'morning', startTime: '07:00', endTime: '15:00', color: '#3b82f6' }, { id: 'shift-2', name: 'Afternoon', type: 'afternoon', startTime: '15:00', endTime: '23:00', color: '#f59e0b' }, { id: 'shift-3', name: 'Night', type: 'night', startTime: '23:00', endTime: '07:00', color: '#6366f1' }, { id: 'shift-4', name: 'Off', type: 'off', startTime: '00:00', endTime: '00:00', color: '#94a3b8' },
  ],
  nurses: [
    ['nurse-1', 'Sarah Johnson', 'sarah.j@hospital.com', '555-0101', 'Charge Nurse', 'dept-1', 40], ['nurse-2', 'Michael Chen', 'michael.c@hospital.com', '555-0102', 'RN', 'dept-2', 40], ['nurse-3', 'Emily Rodriguez', 'emily.r@hospital.com', '555-0103', 'RN', 'dept-3', 36], ['nurse-4', 'James Wilson', 'james.w@hospital.com', '555-0104', 'LPN', 'dept-3', 40], ['nurse-5', 'Lisa Thompson', 'lisa.t@hospital.com', '555-0105', 'CNA', 'dept-4', 40], ['nurse-6', 'David Park', 'david.p@hospital.com', '555-0106', 'RN', 'dept-5', 40],
  ].map(([id, name, email, phone, role, departmentId, maxHoursPerWeek]) => ({ id, name, email, phone, role, departmentId, maxHoursPerWeek, isActive: true })),
  rosterEntries: [],
  leaveRequests: [
    { id: 'leave-1', nurseId: 'nurse-3', startDate: '2026-05-26', endDate: '2026-05-28', type: 'vacation', status: 'approved', reason: 'Family vacation' },
    { id: 'leave-2', nurseId: 'nurse-5', startDate: '2026-05-30', endDate: '2026-05-30', type: 'sick', status: 'pending', reason: 'Medical appointment' },
  ],
};

async function ensureDatabase() {
  await pool.query('SELECT 1');
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  const count = await pool.query('SELECT count(*)::int AS count FROM users');
  if (count.rows[0].count === 0) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('First run requires ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to create the initial administrator.');
    }
    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query('BEGIN');
    try {
      const user = await pool.query("INSERT INTO users(email,password_hash,role) VALUES ($1,$2,'admin') RETURNING id", [email, passwordHash]);
      const parsed = stateSchema.parse(initialState);
      await pool.query('INSERT INTO roster_state(id,data,updated_by) VALUES (\'default\',$1,$2)', [JSON.stringify(parsed), user.rows[0].id]);
      await pool.query("INSERT INTO audit_logs(actor_id,action,metadata) VALUES ($1,'system.bootstrap',jsonb_build_object('role','admin'))", [user.rows[0].id]);
      await pool.query('COMMIT');
      console.info('Created the initial administrator account.');
    } catch (error) { await pool.query('ROLLBACK'); throw error; }
  }
  const seeded = await pool.query("INSERT INTO roster_state(id,data) VALUES ('default',$1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(stateSchema.parse(initialState))]);
  if (seeded.rowCount) console.info('Initialized roster data.');
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } }, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '2mb', strict: true }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again later.' } });
const requireOrigin = (req, res, next) => {
  const origin = req.get('origin');
  const allowed = new Set([process.env.APP_ORIGIN, ...(production ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])].filter(Boolean));
  if (origin && !allowed.has(origin)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  next();
};
app.use('/api', requireOrigin);

async function authenticate(req, res, next) {
  const token = req.cookies?.[cookieName] ?? readCookie(req.headers.cookie, cookieName);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const claims = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: 'nursing-roster' });
    const result = await pool.query('SELECT id,email,role,active,updated_at FROM users WHERE id=$1', [claims.sub]);
    const user = result.rows[0];
    if (!user?.active || claims.ver !== user.updated_at.getTime()) return res.status(401).json({ error: 'Authentication required.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Authentication required.' }); }
}
function readCookie(header, name) {
  const item = header?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : undefined;
}
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to perform this action.' });
const audit = async (req, action, metadata = {}) => pool.query('INSERT INTO audit_logs(actor_id,action,metadata,ip_address) VALUES ($1,$2,$3,$4)', [req.user?.id ?? null, action, JSON.stringify(metadata), req.ip]);

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  try {
    const result = await pool.query('SELECT id,email,password_hash,role,active,updated_at FROM users WHERE email=$1', [parsed.data.email.toLowerCase().trim()]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(parsed.data.password, user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
    if (!user?.active || !valid) {
      await pool.query("INSERT INTO audit_logs(action,metadata,ip_address) VALUES ('auth.login_failed',jsonb_build_object('email',left($1,254)),$2)", [parsed.data.email.toLowerCase().trim(), req.ip]);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ ver: user.updated_at.getTime() }, jwtSecret, { algorithm: 'HS256', subject: user.id, issuer: 'nursing-roster', expiresIn: '8h' });
    await audit({ ...req, user }, 'auth.login', { role: user.role });
    res.cookie(cookieName, token, cookieOptions);
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', authenticate, async (req, res, next) => {
  try { res.clearCookie(cookieName, { httpOnly: true, secure: production, sameSite: 'strict', path: '/' }); await audit(req, 'auth.logout', { role: req.user.role }); res.status(204).end(); }
  catch (error) { next(error); }
});
app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } }));

app.get('/api/state', authenticate, async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT data,updated_at FROM roster_state WHERE id='default'");
    const fullState = stateSchema.parse(result.rows[0].data);
    const visible = visibleStateForUser(fullState, _req.user);
    if (!visible) return res.status(403).json({ error: 'No staff profile is linked to this account.' });
    res.json({ state: visible, updatedAt: result.rows[0].updated_at });
  }
  catch (error) { next(error); }
});
app.put('/api/state', authenticate, requireRole('admin', 'scheduler'), async (req, res, next) => {
  const parsed = stateSchema.safeParse(req.body?.state);
  if (!parsed.success) return res.status(400).json({ error: 'Roster data did not pass validation.', details: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) });
  const clientVersion = req.get('if-match');
  if (!clientVersion) return res.status(428).json({ error: 'Reload roster data before saving.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = await client.query("SELECT data,updated_at FROM roster_state WHERE id='default' FOR UPDATE");
    if (new Date(clientVersion).getTime() !== new Date(old.rows[0].updated_at).getTime()) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Roster data changed elsewhere. Reload the page before saving.' }); }
    const saved = await client.query("UPDATE roster_state SET data=$1,updated_by=$2,updated_at=now() WHERE id='default' RETURNING updated_at", [JSON.stringify(parsed.data), req.user.id]);
    const counts = Object.fromEntries(Object.entries(parsed.data).map(([key, items]) => [key, items.length]));
    await client.query('INSERT INTO audit_logs(actor_id,action,metadata,ip_address) VALUES ($1,$2,$3,$4)', [req.user.id, 'roster.state_updated', JSON.stringify({ counts, changedCollections: Object.keys(counts).filter(key => JSON.stringify(old.rows[0].data[key]) !== JSON.stringify(parsed.data[key])) }), req.ip]);
    await client.query('COMMIT');
    res.json({ state: parsed.data, updatedAt: saved.rows[0].updated_at });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.post('/api/leave', authenticate, async (req, res, next) => {
  const parsed = leaveInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid leave request.', details: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await client.query("SELECT data FROM roster_state WHERE id='default' FOR UPDATE");
    const current = stateSchema.parse(row.rows[0].data);
    const nurse = current.nurses.find(item => item.id === parsed.data.nurseId);
    if (!nurse) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Staff profile not found.' }); }
    if (req.user.role === 'nurse' && nurse.email.toLowerCase() !== req.user.email.toLowerCase()) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'You can only request leave for your own staff profile.' }); }
    const leave = { id: randomUUID(), ...parsed.data, status: 'pending' };
    const updated = stateSchema.parse({ ...current, leaveRequests: [...current.leaveRequests, leave] });
    const saved = await client.query("UPDATE roster_state SET data=$1,updated_by=$2,updated_at=now() WHERE id='default' RETURNING updated_at", [JSON.stringify(updated), req.user.id]);
    await client.query('INSERT INTO audit_logs(actor_id,action,metadata,ip_address) VALUES ($1,$2,$3,$4)', [req.user.id, 'leave.request_created', JSON.stringify({ status: 'pending' }), req.ip]);
    await client.query('COMMIT');
    const visibleState = visibleStateForUser(updated, req.user);
    res.status(201).json({ state: stateSchema.parse(visibleState), leave, updatedAt: saved.rows[0].updated_at });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.delete('/api/leave/:id', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await client.query("SELECT data FROM roster_state WHERE id='default' FOR UPDATE");
    const current = stateSchema.parse(row.rows[0].data);
    const leave = current.leaveRequests.find(item => item.id === req.params.id);
    if (!leave) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Leave request not found.' }); }
    const nurse = current.nurses.find(item => item.id === leave.nurseId);
    if (req.user.role === 'nurse' && (nurse?.email.toLowerCase() !== req.user.email.toLowerCase() || leave.status !== 'pending')) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'You can only withdraw your own pending leave requests.' }); }
    if (req.user.role !== 'nurse' && !['admin', 'scheduler'].includes(req.user.role)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'You do not have permission to perform this action.' }); }
    const updated = stateSchema.parse({ ...current, leaveRequests: current.leaveRequests.filter(item => item.id !== leave.id) });
    const saved = await client.query("UPDATE roster_state SET data=$1,updated_by=$2,updated_at=now() WHERE id='default' RETURNING updated_at", [JSON.stringify(updated), req.user.id]);
    await client.query('INSERT INTO audit_logs(actor_id,action,metadata,ip_address) VALUES ($1,$2,$3,$4)', [req.user.id, 'leave.request_deleted', JSON.stringify({ status: leave.status }), req.ip]);
    await client.query('COMMIT');
    res.json({ state: visibleStateForUser(updated, req.user), updatedAt: saved.rows[0].updated_at });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.get('/api/users', authenticate, requireRole('admin'), async (_req, res, next) => {
  try { const result = await pool.query('SELECT id,email,role,active,created_at FROM users ORDER BY created_at'); res.json({ users: result.rows }); }
  catch (error) { next(error); }
});
app.post('/api/users', authenticate, requireRole('admin'), async (req, res, next) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid user. Passwords must have at least 12 characters and roles must be valid.' });
  try {
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const result = await pool.query('INSERT INTO users(email,password_hash,role) VALUES ($1,$2,$3) RETURNING id,email,role,active,created_at', [parsed.data.email.toLowerCase().trim(), hash, parsed.data.role]);
    await audit(req, 'user.created', { role: result.rows[0].role });
    res.status(201).json({ user: result.rows[0] });
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' }); next(error); }
});
app.patch('/api/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid role, active status, or password update.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(730019423)');
    const target = await client.query('SELECT id,email,role,active FROM users WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!target.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Account not found.' }); }
    const nextRole = parsed.data.role ?? target.rows[0].role;
    const nextActive = parsed.data.active ?? target.rows[0].active;
    if (target.rows[0].role === 'admin' && target.rows[0].active && (nextRole !== 'admin' || !nextActive)) {
      const activeAdmins = await client.query("SELECT count(*)::int AS count FROM users WHERE role='admin' AND active=true");
      if (activeAdmins.rows[0].count <= 1) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'The last active administrator cannot be demoted or deactivated.' }); }
    }
    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null;
    const updated = await client.query('UPDATE users SET role=$1,active=$2,password_hash=COALESCE($3,password_hash),updated_at=now() WHERE id=$4 RETURNING id,email,role,active,created_at', [nextRole, nextActive, passwordHash, req.params.id]);
    await client.query('INSERT INTO audit_logs(actor_id,action,metadata,ip_address) VALUES ($1,$2,$3,$4)', [req.user.id, 'user.updated', JSON.stringify({ role: nextRole, active: nextActive, passwordChanged: Boolean(passwordHash) }), req.ip]);
    await client.query('COMMIT');
    res.json({ user: updated.rows[0] });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.get('/api/audit', authenticate, requireRole('admin'), async (req, res, next) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  try { const result = await pool.query('SELECT id,actor_id,action,metadata,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT $1', [limit]); res.json({ events: result.rows }); }
  catch (error) { next(error); }
});

if (production) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  app.use(express.static(path.join(root, 'dist'), { index: false, maxAge: '1y', immutable: true, setHeaders(res, filePath) { if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.get('/{*path}', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(root, 'dist', 'index.html')));
}
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.code || error.name || 'UnknownError');
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Request body must be valid JSON.' });
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

export { app, ensureDatabase, pool };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureDatabase().then(() => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.info(`NurseRoster listening on port ${port}`));
  }).catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
}
