import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import ProjectLoader from './components/ProjectLoader';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import AIVisibilityAudit from './pages/tools/AIVisibilityAudit';
import DomainProfiler from './pages/tools/DomainProfiler';
import AIReadiness from './pages/tools/AIReadiness';
import WebSearch from './pages/tools/WebSearch';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Rankings from './pages/Rankings';
import Inquiries from './pages/Inquiries';
import Help from './pages/Help';
import Settings from './pages/Settings';
import Orders from './pages/Orders';
import Team from './pages/Team';
import AdminDashboard from './pages/AdminDashboard';
import AdminManager from './pages/AdminManager';
import AdminUsers from './pages/AdminUsers';
import DashboardLayout from './components/DashboardLayout';
import { Toaster } from 'react-hot-toast';
import './index.css';

const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/admin/stats" replace />;
  }
  
  return <Navigate to="/dashboard/projects" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProjectProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', background: '#1E293B', color: '#fff', fontSize: '14px' } }} />
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Private Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/dashboard/audit" element={<AIVisibilityAudit />} />
              <Route path="/dashboard/profiler" element={<DomainProfiler />} />
              <Route path="/dashboard/readiness" element={<AIReadiness />} />
              <Route path="/dashboard/search" element={<WebSearch />} />
              <Route path="/dashboard/projects" element={<Projects />} />
              
              {/* Project-Specific Routes with Data Loading */}
              <Route path="/dashboard/projects/:projectId" element={<ProjectLoader />}>
                <Route index element={<ProjectDetail />} />
                <Route path="audit" element={<AIVisibilityAudit />} />
                <Route path="profiler" element={<DomainProfiler />} />
                <Route path="readiness" element={<AIReadiness />} />
                <Route path="search" element={<WebSearch />} />
                <Route path="rankings" element={<Rankings />} />
              </Route>
              <Route path="/dashboard/inquiries" element={<Inquiries />} />
              <Route path="/dashboard/help" element={<Help />} />
              <Route path="/dashboard/orders" element={<Orders />} />
              <Route path="/dashboard/admin/stats" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/manager" element={<AdminManager />} />
              <Route path="/dashboard/admin/users" element={<AdminUsers />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/pricing" element={<Pricing />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        </ProjectProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
