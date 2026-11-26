import test from 'node:test';
import assert from 'node:assert/strict';
import { stateSchema, loginSchema, leaveInputSchema, userSchema, userUpdateSchema, canWriteRoster, visibleStateForUser } from './validation.mjs';

const validState = {
  departments: [{ id: 'd1', name: 'ICU', description: 'Critical care' }],
  shiftTemplates: [{ id: 's1', name: 'Morning', type: 'morning', startTime: '07:00', endTime: '15:00', color: '#123abc' }],
  nurses: [{ id: 'n1', name: 'Alex Nurse', email: 'alex@example.test', phone: '555-0101', role: 'RN', departmentId: 'd1', maxHoursPerWeek: 40, isActive: true }],
  rosterEntries: [{ id: 'r1', nurseId: 'n1', shiftTemplateId: 's1', departmentId: 'd1', date: '2026-11-27' }],
  leaveRequests: [{ id: 'l1', nurseId: 'n1', startDate: '2026-12-01', endDate: '2026-12-02', type: 'vacation', status: 'pending', reason: 'Personal leave' }],
};

test('accepts valid roster state and rejects unknown fields', () => {
  assert.deepEqual(stateSchema.parse(validState), validState);
  assert.equal(stateSchema.safeParse({ ...validState, extra: true }).success, false);
});

test('rejects invalid emails, duplicate assignments, and broken references', () => {
  const invalidNurse = { ...validState, nurses: [{ ...validState.nurses[0], email: 'invalid' }] };
  assert.equal(stateSchema.safeParse(invalidNurse).success, false);
  const duplicateShift = { ...validState, rosterEntries: [...validState.rosterEntries, { ...validState.rosterEntries[0], id: 'r2' }] };
  assert.equal(stateSchema.safeParse(duplicateShift).success, false);
  const brokenReference = { ...validState, rosterEntries: [{ ...validState.rosterEntries[0], shiftTemplateId: 'missing' }] };
  assert.equal(stateSchema.safeParse(brokenReference).success, false);
});

test('rejects impossible dates and leave ranges ending before they start', () => {
  assert.equal(stateSchema.safeParse({ ...validState, rosterEntries: [{ ...validState.rosterEntries[0], date: '2026-02-30' }] }).success, false);
  assert.equal(stateSchema.safeParse({ ...validState, leaveRequests: [{ ...validState.leaveRequests[0], endDate: '2026-11-30' }] }).success, false);
});

test('enforces manager and administrator write roles', () => {
  assert.equal(canWriteRoster('admin'), true);
  assert.equal(canWriteRoster('scheduler'), true);
  assert.equal(canWriteRoster('nurse'), false);
});

test('limits nurse accounts to their own roster and leave records', () => {
  const second = { ...validState.nurses[0], id: 'n2', name: 'Casey Nurse', email: 'casey@example.test' };
  const state = stateSchema.parse({ ...validState, nurses: [...validState.nurses, second], rosterEntries: [...validState.rosterEntries, { id: 'r2', nurseId: 'n2', shiftTemplateId: 's1', departmentId: 'd1', date: '2026-11-28' }], leaveRequests: [...validState.leaveRequests, { id: 'l2', nurseId: 'n2', startDate: '2026-12-03', endDate: '2026-12-03', type: 'sick', status: 'pending', reason: 'Private reason' }] });
  const view = visibleStateForUser(state, { role: 'nurse', email: 'alex@example.test' });
  assert.deepEqual(view.nurses.map(item => item.id), ['n1']);
  assert.deepEqual(view.rosterEntries.map(item => item.nurseId), ['n1']);
  assert.deepEqual(view.leaveRequests.map(item => item.nurseId), ['n1']);
  assert.equal(visibleStateForUser(state, { role: 'nurse', email: 'unlinked@example.test' }), null);
  assert.equal(visibleStateForUser(state, { role: 'scheduler', email: 'scheduler@example.test' }).nurses.length, 2);
});

test('requires valid login credentials and strong account passwords', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@example.test', password: 'secret' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success, false);
  assert.equal(userSchema.safeParse({ email: 'a@example.test', password: 'short', role: 'nurse' }).success, false);
  assert.equal(userSchema.safeParse({ email: 'a@example.test', password: 'at-least-twelve', role: 'scheduler' }).success, true);
  assert.equal(userUpdateSchema.safeParse({ active: false }).success, true);
  assert.equal(userUpdateSchema.safeParse({}).success, false);
});

test('accepts well-formed leave requests and forbids client-assigned status', () => {
  const request = { nurseId: 'n1', startDate: '2026-12-01', endDate: '2026-12-02', type: 'vacation', reason: 'Personal leave' };
  assert.equal(leaveInputSchema.safeParse(request).success, true);
  assert.equal(leaveInputSchema.safeParse({ ...request, endDate: '2026-11-30' }).success, false);
  assert.equal(leaveInputSchema.safeParse({ ...request, status: 'approved' }).success, false);
});
