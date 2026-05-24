import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RosterProvider } from './context/RosterContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { Staff } from './pages/Staff';
import { Shifts } from './pages/Shifts';
import { Departments } from './pages/Departments';
import { Leave } from './pages/Leave';

function App() {
  return (
    <RosterProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="roster" element={<Roster />} />
            <Route path="staff" element={<Staff />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="departments" element={<Departments />} />
            <Route path="leave" element={<Leave />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RosterProvider>
  );
}

export default App;
