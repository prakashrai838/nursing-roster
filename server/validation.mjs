import { z } from 'zod';

const id = z.string().min(1).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const department = z.object({ id, name: z.string().trim().min(1).max(80), description: z.string().max(500) }).strict();
const shift = z.object({ id, name: z.string().trim().min(1).max(80), type: z.enum(['morning', 'afternoon', 'night', 'off']), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), color: hexColor }).strict();
const nurse = z.object({ id, name: z.string().trim().min(1).max(120), email: z.string().email().max(254), phone: z.string().max(30), role: z.enum(['RN', 'LPN', 'CNA', 'Charge Nurse']), departmentId: id, maxHoursPerWeek: z.number().int().min(1).max(168), isActive: z.boolean() }).strict();
const rosterEntry = z.object({ id, nurseId: id, shiftTemplateId: id, departmentId: id, date, notes: z.string().max(1000).optional() }).strict();
const leaveRequest = z.object({ id, nurseId: id, startDate: date, endDate: date, type: z.enum(['vacation', 'sick', 'personal', 'other']), status: z.enum(['pending', 'approved', 'rejected']), reason: z.string().max(1000) }).strict();

export const stateSchema = z.object({ nurses: z.array(nurse).max(5000), departments: z.array(department).max(500), shiftTemplates: z.array(shift).max(100), rosterEntries: z.array(rosterEntry).max(100000), leaveRequests: z.array(leaveRequest).max(50000) }).strict().superRefine((state, ctx) => {
  const unique = (items, label, key = item => item.id) => {
    const found = new Set();
    items.forEach((item, index) => { const value = key(item); if (found.has(value)) ctx.addIssue({ code: 'custom', path: [label, index], message: `Duplicate ${label} value` }); found.add(value); });
  };
  unique(state.nurses, 'nurses', n => n.email.toLowerCase());
  unique(state.departments, 'departments'); unique(state.shiftTemplates, 'shiftTemplates');
  unique(state.nurses, 'nurses'); unique(state.rosterEntries, 'rosterEntries', r => `${r.nurseId}:${r.date}`);
  unique(state.leaveRequests, 'leaveRequests');
  const departments = new Set(state.departments.map(item => item.id));
  const nurses = new Set(state.nurses.map(item => item.id));
  const shifts = new Set(state.shiftTemplates.map(item => item.id));
  state.nurses.forEach((n, i) => { if (!departments.has(n.departmentId)) ctx.addIssue({ code: 'custom', path: ['nurses', i, 'departmentId'], message: 'Unknown department' }); });
  state.rosterEntries.forEach((r, i) => {
    if (!nurses.has(r.nurseId) || !shifts.has(r.shiftTemplateId) || !departments.has(r.departmentId)) ctx.addIssue({ code: 'custom', path: ['rosterEntries', i], message: 'Roster entry references an unknown record' });
  });
  state.leaveRequests.forEach((l, i) => {
    if (!nurses.has(l.nurseId)) ctx.addIssue({ code: 'custom', path: ['leaveRequests', i, 'nurseId'], message: 'Unknown nurse' });
    if (l.endDate < l.startDate) ctx.addIssue({ code: 'custom', path: ['leaveRequests', i, 'endDate'], message: 'End date must be on or after start date' });
  });
});

export const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).strict();
export const leaveInputSchema = z.object({ nurseId: id, startDate: date, endDate: date, type: z.enum(['vacation', 'sick', 'personal', 'other']), reason: z.string().trim().min(1).max(1000) }).strict().superRefine((leave, ctx) => {
  if (leave.endDate < leave.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after start date' });
});
export const userSchema = z.object({ email: z.string().email().max(254), password: z.string().min(12).max(200), role: z.enum(['admin', 'scheduler', 'nurse']) }).strict();
export const userUpdateSchema = z.object({ password: z.string().min(12).max(200).optional(), role: z.enum(['admin', 'scheduler', 'nurse']).optional(), active: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0, 'Provide a role, active status, or password update.');
export const canWriteRoster = role => role === 'admin' || role === 'scheduler';

export function visibleStateForUser(state, user) {
  if (user.role !== 'nurse') return state;
  const nurse = state.nurses.find(item => item.email.toLowerCase() === user.email.toLowerCase());
  if (!nurse) return null;
  const rosterEntries = state.rosterEntries.filter(entry => entry.nurseId === nurse.id);
  const shiftIds = new Set(rosterEntries.map(entry => entry.shiftTemplateId));
  const departmentIds = new Set([nurse.departmentId, ...rosterEntries.map(entry => entry.departmentId)]);
  return stateSchema.parse({ nurses: [nurse], departments: state.departments.filter(item => departmentIds.has(item.id)), shiftTemplates: state.shiftTemplates.filter(item => shiftIds.has(item.id)), rosterEntries, leaveRequests: state.leaveRequests.filter(item => item.nurseId === nurse.id) });
}
