import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { Modal } from '../components/Modal';
import type { Department } from '../types';
import { useAuth } from '../context/AuthContext';

const emptyDept: Omit<Department, 'id'> = { name: '', description: '' };

export function Departments() {
  const { state, dispatch } = useRoster();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'scheduler';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyDept);

  function openAdd() {
    setEditing(null);
    setForm(emptyDept);
    setModalOpen(true);
  }

  function openEdit(dept: Department) {
    setEditing(dept);
    setForm(dept);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      dispatch({ type: 'UPDATE_DEPARTMENT', payload: { ...form, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_DEPARTMENT', payload: form });
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    const staffCount = state.nurses.filter(n => n.departmentId === id).length;
    if (staffCount > 0) {
      alert(`Cannot delete: ${staffCount} staff member(s) assigned to this department.`);
      return;
    }
    if (confirm('Delete this department?')) {
      dispatch({ type: 'DELETE_DEPARTMENT', payload: id });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Manage hospital wards and units</p>
        </div>
        {canManage && <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium">
          <Plus size={20} /> Add Department
        </button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {state.departments.map(dept => {
          const staffCount = state.nurses.filter(n => n.departmentId === dept.id && n.isActive).length;
          return (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                </div>
                {canManage && <div className="flex gap-1">
                  <button onClick={() => openEdit(dept)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">{staffCount} active staff</span>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
