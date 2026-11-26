import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { Modal } from '../components/Modal';
import { getDepartmentName } from '../utils/helpers';
import type { Nurse } from '../types';
import { useAuth } from '../context/AuthContext';

const emptyNurse: Omit<Nurse, 'id'> = {
  name: '',
  email: '',
  phone: '',
  role: 'RN',
  departmentId: '',
  maxHoursPerWeek: 40,
  isActive: true,
};

export function Staff() {
  const { state, dispatch } = useRoster();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'scheduler';
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Nurse | null>(null);
  const [form, setForm] = useState(emptyNurse);

  const filtered = state.nurses.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.email.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyNurse, departmentId: state.departments[0]?.id ?? '' });
    setModalOpen(true);
  }

  function openEdit(nurse: Nurse) {
    setEditing(nurse);
    setForm(nurse);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      dispatch({ type: 'UPDATE_NURSE', payload: { ...form, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_NURSE', payload: form });
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    if (confirm('Remove this staff member? Their roster entries will also be deleted.')) {
      dispatch({ type: 'DELETE_NURSE', payload: id });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage nurses and care staff</p>
        </div>
        {canManage && <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Add Staff
        </button>}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Max Hours</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(nurse => (
              <tr key={nurse.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{nurse.name}</p>
                  <p className="text-sm text-gray-500">{nurse.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                    {nurse.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{getDepartmentName(state, nurse.departmentId)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{nurse.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{nurse.maxHoursPerWeek}h/week</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    nurse.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {nurse.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {canManage && <>
                    <button onClick={() => openEdit(nurse)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil size={18} /></button>
                    <button onClick={() => handleDelete(nurse.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded ml-1"><Trash2 size={18} /></button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No staff members found</p>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Nurse['role'] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="RN">RN</option>
                <option value="LPN">LPN</option>
                <option value="CNA">CNA</option>
                <option value="Charge Nurse">Charge Nurse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                {state.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Hours/Week</label>
              <input required type="number" min={1} max={60} value={form.maxHoursPerWeek}
                onChange={e => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.isActive ? 'active' : 'inactive'}
                onChange={e => setForm({ ...form, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              {editing ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
