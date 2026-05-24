import { format, parseISO, isWithinInterval } from 'date-fns';
import type { AppState } from '../types';

export function getShiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = eh - sh + (em - sm) / 60;
  if (hours <= 0) hours += 24;
  return hours;
}

export function getNurseWeeklyHours(
  state: AppState,
  nurseId: string,
  weekStart: Date,
  weekEnd: Date
): number {
  return state.rosterEntries
    .filter(entry => {
      if (entry.nurseId !== nurseId) return false;
      const date = parseISO(entry.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    })
    .reduce((total, entry) => {
      const shift = state.shiftTemplates.find(s => s.id === entry.shiftTemplateId);
      if (!shift || shift.type === 'off') return total;
      return total + getShiftHours(shift.startTime, shift.endTime);
    }, 0);
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function getDepartmentName(state: AppState, id: string): string {
  return state.departments.find(d => d.id === id)?.name ?? 'Unknown';
}

export function getNurseName(state: AppState, id: string): string {
  return state.nurses.find(n => n.id === id)?.name ?? 'Unknown';
}

export function getShiftName(state: AppState, id: string): string {
  return state.shiftTemplates.find(s => s.id === id)?.name ?? 'Unknown';
}

export function isOnLeave(state: AppState, nurseId: string, date: string): boolean {
  return state.leaveRequests.some(leave => {
    if (leave.nurseId !== nurseId || leave.status !== 'approved') return false;
    const d = parseISO(date);
    return isWithinInterval(d, { start: parseISO(leave.startDate), end: parseISO(leave.endDate) });
  });
}
