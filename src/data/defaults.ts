import type { AppState } from '../types';

export const defaultState: AppState = {
  departments: [
    { id: 'dept-1', name: 'Emergency', description: 'Emergency Department' },
    { id: 'dept-2', name: 'ICU', description: 'Intensive Care Unit' },
    { id: 'dept-3', name: 'Medical Ward', description: 'General Medical Ward' },
    { id: 'dept-4', name: 'Surgical Ward', description: 'Post-operative care' },
    { id: 'dept-5', name: 'Pediatrics', description: 'Pediatric care unit' },
  ],
  shiftTemplates: [
    { id: 'shift-1', name: 'Morning', type: 'morning', startTime: '07:00', endTime: '15:00', color: '#3b82f6' },
    { id: 'shift-2', name: 'Afternoon', type: 'afternoon', startTime: '15:00', endTime: '23:00', color: '#f59e0b' },
    { id: 'shift-3', name: 'Night', type: 'night', startTime: '23:00', endTime: '07:00', color: '#6366f1' },
    { id: 'shift-4', name: 'Off', type: 'off', startTime: '00:00', endTime: '00:00', color: '#94a3b8' },
  ],
  nurses: [
    { id: 'nurse-1', name: 'Sarah Johnson', email: 'sarah.j@hospital.com', phone: '555-0101', role: 'Charge Nurse', departmentId: 'dept-1', maxHoursPerWeek: 40, isActive: true },
    { id: 'nurse-2', name: 'Michael Chen', email: 'michael.c@hospital.com', phone: '555-0102', role: 'RN', departmentId: 'dept-2', maxHoursPerWeek: 40, isActive: true },
    { id: 'nurse-3', name: 'Emily Rodriguez', email: 'emily.r@hospital.com', phone: '555-0103', role: 'RN', departmentId: 'dept-3', maxHoursPerWeek: 36, isActive: true },
    { id: 'nurse-4', name: 'James Wilson', email: 'james.w@hospital.com', phone: '555-0104', role: 'LPN', departmentId: 'dept-3', maxHoursPerWeek: 40, isActive: true },
    { id: 'nurse-5', name: 'Lisa Thompson', email: 'lisa.t@hospital.com', phone: '555-0105', role: 'CNA', departmentId: 'dept-4', maxHoursPerWeek: 40, isActive: true },
    { id: 'nurse-6', name: 'David Park', email: 'david.p@hospital.com', phone: '555-0106', role: 'RN', departmentId: 'dept-5', maxHoursPerWeek: 40, isActive: true },
  ],
  rosterEntries: [],
  leaveRequests: [
    { id: 'leave-1', nurseId: 'nurse-3', startDate: '2026-05-26', endDate: '2026-05-28', type: 'vacation', status: 'approved', reason: 'Family vacation' },
    { id: 'leave-2', nurseId: 'nurse-5', startDate: '2026-05-30', endDate: '2026-05-30', type: 'sick', status: 'pending', reason: 'Medical appointment' },
  ],
};
