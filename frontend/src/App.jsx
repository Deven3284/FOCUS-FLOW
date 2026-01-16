import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Layout from './components/Layout'
import { useUserStore } from './store/useUserStore'
import TodayTask from './pages/TodayTask'
import TaskHistory from './pages/TaskHistory'
import AccountSettings from './pages/AccountSettings'
import SOPDocument from './pages/SOPDocument'
import './App.css'
import Users from './components/admin/Users'
import AdminRoute from './components/admin/AdminRoute'
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';


// Wrapper for User Protected Routes
const UserRoute = ({ children }) => {
  const { isAuthenticated, role } = useUserStore();

  if (!isAuthenticated) return <Navigate to="/app/login" replace />;
  // Prevent Admin from accessing User routes
  if (role === 'admin') return <Navigate to="/app/admin/dashboard" replace />;

  return children;
};

// Wrapper for Public Routes (Login)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, role } = useUserStore();

  if (isAuthenticated) {
    // Redirect based on role
    if (role === 'admin') return <Navigate to="/app/admin/dashboard" replace />;
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Routes>
          <Route path="/" element={<Navigate to="/app/login" replace />} />

          {/* Public Login Pages */}
          <Route path="/app/login" element={<PublicRoute><Login /></PublicRoute>} />
          {/* <Route path="/app/admin/login" element={<PublicRoute><AdminLogin /></PublicRoute>} /> */}

          {/* User Routes - Wrapped in UserRoute */}
          <Route path="/app" element={<UserRoute><Layout /></UserRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="task" element={<TodayTask />} />
            <Route path="history" element={<TaskHistory />} />
            <Route path="settings" element={<AccountSettings />} />
            <Route path="sop-documents" element={<SOPDocument />} />
            <Route path="*" element={<Dashboard />} />
          </Route>

          {/* Admin Routes - Wrapped in AdminRoute */}
          <Route path="/app/admin" element={<AdminRoute><Layout /></AdminRoute>}>
            <Route index element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="task" element={<TodayTask />} />
            <Route path="history" element={<TaskHistory />} />
            <Route path="settings" element={<AccountSettings />} />
            {/* <Route path="master" element={<MasterPage />} /> */}
            <Route path="master/users" element={<Users />} />
            <Route path="sop-documents" element={<SOPDocument />} />
          </Route>
        </Routes>
      </LocalizationProvider>
    </BrowserRouter>
  )
}

export default App
