import { useRoster } from '../context/RosterContext';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Users, CalendarDays, Building2, AlertCircle } from 'lucide-react';
import { getDepartmentName, getNurseName, getShiftName } from '../utils/helpers';

export function Dashboard() {
  const { state } = useRoster();
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const todayShifts = state.rosterEntries.filter(r => r.date === today);
  const activeNurses = state.nurses.filter(n => n.isActive).length;
  const pendingLeave = state.leaveRequests.filter(l => l.status === 'pending').length;
  const weekShifts = state.rosterEntries.filter(r => {
    const d = parseISO(r.date);
    return d >= weekStart && d <= weekEnd;
  }).length;

  const stats = [
    { label: 'Active Staff', value: activeNurses, icon: Users, color: 'bg-blue-500' },
    { label: "Today's Shifts", value: todayShifts.length, icon: CalendarDays, color: 'bg-emerald-500' },
    { label: 'Departments', value: state.departments.length, icon: Building2, color: 'bg-violet-500' },
    { label: 'Pending Leave', value: pendingLeave, icon: AlertCircle, color: 'bg-amber-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Today's Shifts</h2>
          </div>
          <div className="p-4">
            {todayShifts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No shifts scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {todayShifts.map(entry => {
                  const shift = state.shiftTemplates.find(s => s.id === entry.shiftTemplateId);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div
                        className="w-1 h-10 rounded-full"
                        style={{ backgroundColor: shift?.color ?? '#94a3b8' }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{getNurseName(state, entry.nurseId)}</p>
                        <p className="text-sm text-gray-500">
                          {getShiftName(state, entry.shiftTemplateId)} · {getDepartmentName(state, entry.departmentId)}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400">
                        {shift?.startTime} - {shift?.endTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Stats</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shifts this week</span>
              <span className="font-semibold text-gray-900">{weekShifts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total staff members</span>
              <span className="font-semibold text-gray-900">{state.nurses.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shift templates</span>
              <span className="font-semibold text-gray-900">{state.shiftTemplates.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Approved leave requests</span>
              <span className="font-semibold text-gray-900">
                {state.leaveRequests.filter(l => l.status === 'approved').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
