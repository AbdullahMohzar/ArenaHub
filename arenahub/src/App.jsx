import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy loading pages to improve performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Dashboards
const PlayerDashboard = lazy(() => import('./pages/PlayerDashboard'));
const CaptainDashboard = lazy(() => import('./pages/CaptainDashboard'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Loading Fallback spinner matching theme
const PageLoader = () => (
  <div className="w-full min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
  </div>
);

// dynamic dashboard router component
const DynamicDashboard = () => {
  const role = localStorage.getItem('userRole');
  const normalizedRole = role ? role.toUpperCase() : '';
  switch(normalizedRole) {
    case 'ADMIN': return <AdminDashboard />;
    case 'OWNER': return <OwnerDashboard />;
    case 'CAPTAIN': return <CaptainDashboard />;
    case 'PLAYER': 
    case 'USER': // Included USER fallback just in case old accounts use this
      return <PlayerDashboard />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/dashboard" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/venues" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/my-games" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/equipment" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
            <Route path="/admin/disputes" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;