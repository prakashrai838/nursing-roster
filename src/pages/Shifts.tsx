import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { Modal } from '../components/Modal';
import type { ShiftTemplate } from '../types';
import { useAuth } from '../context/AuthContext';

const emptyShift: Omit<ShiftTemplate, 'id'> = {
  name: '',
  type: 'morning',
  startTime: '07:00',
  endTime: '15:00',
  color: '#3b82f6',
};

const shiftColors = ['#3b82f6', '#f59e0b', '#6366f1', '#94a3b8', '#10b981', '#ef4444', '#8b5cf6'];

export function Shifts() {
  const { state, dispatch } = useRoster();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'scheduler';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [form, setForm] = useState(emptyShift);

  function openAdd() {
    setEditing(null);
    setForm(emptyShift);
    setModalOpen(true);
  }

  function openEdit(shift: ShiftTemplate) {
    setEditing(shift);
    setForm(shift);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      dispatch({ type: 'UPDATE_SHIFT', payload: { ...form, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_SHIFT', payload: form });
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this shift template?')) {
      dispatch({ type: 'DELETE_SHIFT', payload: id });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Templates</h1>
          <p className="text-gray-500 mt-1">Configure shift types and timings</p>
        </div>
        {canManage && <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium">
          <Plus size={20} /> Add Shift
        </button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {state.shiftTemplates.map(shift => (
          <div key={shift.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-12 rounded-full" style={{ backgroundColor: shift.color }} />
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{shift.type} shift</p>
                </div>
              </div>
              {canManage && <div className="flex gap-1">
                <button onClick={() => openEdit(shift)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(shift.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                  <Trash2 size={16} />
                </button>
              </div>}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Start</span>
              <span className="font-medium text-gray-900">{shift.startTime}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">End</span>
              <span className="font-medium text-gray-900">{shift.endTime}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Shift' : 'Add Shift'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ShiftTemplate['type'] })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input required type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input required type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {shiftColors.map(color => (
                <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 ${form.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              {editing ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
