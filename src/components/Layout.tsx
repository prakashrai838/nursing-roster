import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  Building2,
  Palmtree,
  Stethoscope,
  LogOut,
} from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/roster', icon: CalendarDays, label: 'Roster' },
  { to: '/staff', icon: Users, label: 'Staff' },
  { to: '/shifts', icon: Clock, label: 'Shifts' },
  { to: '/departments', icon: Building2, label: 'Departments' },
  { to: '/leave', icon: Palmtree, label: 'Leave' },
];

export function Layout() {
  const { isLoading, ready, loadFailed, error, clearError, retry } = useRoster();
  const { user, signOut } = useAuth();
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">NurseRoster</h1>
              <p className="text-xs text-gray-500">Staff Scheduling</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <p className="text-xs text-gray-400 capitalize mt-1">{user?.role}</p>
          <button onClick={() => void signOut()} className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {error && <div role="alert" className="m-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={clearError} aria-label="Dismiss error">×</button></div>}
        {isLoading ? <div className="p-8 text-gray-500">Loading roster data…</div> : !ready || loadFailed ? <div className="p-8"><p className="text-gray-700 mb-3">Roster data could not be loaded. Changes are disabled until the server connection is restored.</p><button onClick={retry} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Retry</button></div> : <Outlet />}
      </main>
    </div>
  );
}
