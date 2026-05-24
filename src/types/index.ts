export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off';

export interface ShiftTemplate {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  color: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
}

export interface Nurse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'RN' | 'LPN' | 'CNA' | 'Charge Nurse';
  departmentId: string;
  maxHoursPerWeek: number;
  isActive: boolean;
}

export interface RosterEntry {
  id: string;
  nurseId: string;
  shiftTemplateId: string;
  departmentId: string;
  date: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  nurseId: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface AppState {
  nurses: Nurse[];
  departments: Department[];
  shiftTemplates: ShiftTemplate[];
  rosterEntries: RosterEntry[];
  leaveRequests: LeaveRequest[];
}
