import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  Building2,
  Palmtree,
  Stethoscope,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/roster', icon: CalendarDays, label: 'Roster' },
  { to: '/staff', icon: Users, label: 'Staff' },
  { to: '/shifts', icon: Clock, label: 'Shifts' },
  { to: '/departments', icon: Building2, label: 'Departments' },
  { to: '/leave', icon: Palmtree, label: 'Leave' },
];

export function Layout() {
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
          <p className="text-xs text-gray-400">Nursing Roster v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
