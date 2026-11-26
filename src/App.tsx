import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RosterProvider } from './context/RosterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { Staff } from './pages/Staff';
import { Shifts } from './pages/Shifts';
import { Departments } from './pages/Departments';
import { Leave } from './pages/Leave';
import { Login } from './pages/Login';

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-gray-500">Loading NurseRoster…</div>;
  if (!user) return <Login />;
  return <RosterProvider><BrowserRouter><Routes>
    <Route element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="roster" element={<Roster />} />
      <Route path="staff" element={<Staff />} />
      <Route path="shifts" element={<Shifts />} />
      <Route path="departments" element={<Departments />} />
      <Route path="leave" element={<Leave />} />
    </Route>
  </Routes></BrowserRouter></RosterProvider>;
}

function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}

export default App;
