import { useState } from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { Modal } from '../components/Modal';
import { getNurseName, formatDate } from '../utils/helpers';
import type { LeaveRequest } from '../types';
import { useAuth } from '../context/AuthContext';

const emptyLeave: Omit<LeaveRequest, 'id'> = {
  nurseId: '',
  startDate: '',
  endDate: '',
  type: 'vacation',
  status: 'pending',
  reason: '',
};

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

export function Leave() {
  const { state, dispatch } = useRoster();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | LeaveRequest['status']>('all');
  const [form, setForm] = useState(emptyLeave);

  const filtered = state.leaveRequests.filter(l =>
    filter === 'all' ? true : l.status === filter
  );

  function openAdd() {
    setForm({ ...emptyLeave, nurseId: state.nurses[0]?.id ?? '' });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'ADD_LEAVE', payload: form });
    setModalOpen(false);
  }

  function updateStatus(leave: LeaveRequest, status: LeaveRequest['status']) {
    dispatch({ type: 'UPDATE_LEAVE', payload: { ...leave, status } });
  }

  function handleDelete(id: string) {
    if (confirm('Delete this leave request?')) {
      dispatch({ type: 'DELETE_LEAVE', payload: id });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 mt-1">Track and approve staff leave requests</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium">
          <Plus size={20} /> Request Leave
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Staff</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Dates</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(leave => (
              <tr key={leave.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{getNurseName(state, leave.nurseId)}</td>
                <td className="px-6 py-4 capitalize text-sm text-gray-600">{leave.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(leave.startDate, 'MMM d')} – {formatDate(leave.endDate, 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{leave.reason}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[leave.status]}`}>
                    {leave.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user?.role !== 'nurse' && leave.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(leave, 'approved')}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded" title="Approve">
                        <Check size={18} />
                      </button>
                      <button onClick={() => updateStatus(leave, 'rejected')}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded ml-1" title="Reject">
                        <X size={18} />
                      </button>
                    </>
                  )}
                  {(user?.role !== 'nurse' || leave.status === 'pending') && <button onClick={() => handleDelete(leave.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded ml-1">
                    <Trash2 size={18} />
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No leave requests found</p>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Leave Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
            <select required value={form.nurseId} onChange={e => setForm({ ...form, nurseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {state.nurses.filter(n => n.isActive).map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as LeaveRequest['type'] })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input required type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Submit</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
