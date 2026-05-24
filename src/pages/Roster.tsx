import { useState } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { Modal } from '../components/Modal';
import { isOnLeave } from '../utils/helpers';

export function Roster() {
  const { state, dispatch } = useRoster();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [deptFilter, setDeptFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ nurseId: string; date: string } | null>(null);
  const [form, setForm] = useState({ shiftTemplateId: '', departmentId: '', notes: '' });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const nurses = state.nurses.filter(n => {
    if (!n.isActive) return false;
    if (deptFilter === 'all') return true;
    return n.departmentId === deptFilter;
  });

  function getEntry(nurseId: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return state.rosterEntries.find(r => r.nurseId === nurseId && r.date === dateStr);
  }

  function openAssign(nurseId: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = getEntry(nurseId, date);
    setSelectedCell({ nurseId, date: dateStr });
    setForm({
      shiftTemplateId: existing?.shiftTemplateId ?? state.shiftTemplates[0]?.id ?? '',
      departmentId: existing?.departmentId ?? state.nurses.find(n => n.id === nurseId)?.departmentId ?? '',
      notes: existing?.notes ?? '',
    });
    setModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCell) return;

    const existing = state.rosterEntries.find(
      r => r.nurseId === selectedCell.nurseId && r.date === selectedCell.date
    );

    if (existing) {
      dispatch({
        type: 'UPDATE_ROSTER_ENTRY',
        payload: { ...existing, ...form },
      });
    } else {
      dispatch({
        type: 'ADD_ROSTER_ENTRY',
        payload: { nurseId: selectedCell.nurseId, date: selectedCell.date, ...form },
      });
    }
    setModalOpen(false);
  }

  function handleClear() {
    if (!selectedCell) return;
    const existing = state.rosterEntries.find(
      r => r.nurseId === selectedCell.nurseId && r.date === selectedCell.date
    );
    if (existing) {
      dispatch({ type: 'DELETE_ROSTER_ENTRY', payload: existing.id });
    }
    setModalOpen(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Roster</h1>
          <p className="text-gray-500 mt-1">Click a cell to assign or edit shifts</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Departments</option>
            {state.departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex items-center bg-white border border-gray-200 rounded-lg">
            <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 hover:bg-gray-50 rounded-l-lg">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 hover:bg-gray-50 rounded-r-lg">
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            Today
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-44 sticky left-0 bg-white">
                Staff
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="px-2 py-3 text-center min-w-[120px]">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-sm font-bold mt-0.5 ${
                    isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nurses.map(nurse => (
              <tr key={nurse.id} className="border-b border-gray-100">
                <td className="px-4 py-3 sticky left-0 bg-white">
                  <p className="font-medium text-gray-900 text-sm">{nurse.name}</p>
                  <p className="text-xs text-gray-400">{nurse.role}</p>
                </td>
                {weekDays.map(day => {
                  const entry = getEntry(nurse.id, day);
                  const shift = entry ? state.shiftTemplates.find(s => s.id === entry.shiftTemplateId) : null;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const onLeave = isOnLeave(state, nurse.id, dateStr);

                  return (
                    <td key={day.toISOString()} className="px-1 py-1">
                      <button
                        onClick={() => openAssign(nurse.id, day)}
                        className={`w-full h-16 rounded-lg border-2 border-dashed transition-all text-xs ${
                          onLeave
                            ? 'border-red-200 bg-red-50 text-red-500'
                            : entry
                              ? 'border-transparent text-white'
                              : 'border-gray-100 hover:border-primary-300 hover:bg-primary-50/50 text-gray-300'
                        }`}
                        style={entry && shift && !onLeave ? { backgroundColor: shift.color } : undefined}
                      >
                        {onLeave ? (
                          <span className="font-medium">On Leave</span>
                        ) : entry && shift ? (
                          <div>
                            <p className="font-semibold">{shift.name}</p>
                            <p className="opacity-80 text-[10px]">{shift.startTime}-{shift.endTime}</p>
                          </div>
                        ) : (
                          <Plus size={16} className="mx-auto" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-4 flex-wrap">
        {state.shiftTemplates.map(shift => (
          <div key={shift.id} className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: shift.color }} />
            {shift.name} ({shift.startTime} - {shift.endTime})
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Shift"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {selectedCell && (
            <p className="text-sm text-gray-500">
              {state.nurses.find(n => n.id === selectedCell.nurseId)?.name} —{' '}
              {format(parseISO(selectedCell.date), 'EEEE, MMM d')}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select
              required
              value={form.shiftTemplateId}
              onChange={e => setForm({ ...form, shiftTemplateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {state.shiftTemplates.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              required
              value={form.departmentId}
              onChange={e => setForm({ ...form, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {state.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
            >
              <Trash2 size={16} /> Clear
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
