import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatSidebar from './components/ChatSidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
// Dashboards
import PlayerDashboard from './pages/PlayerDashboard';
import CaptainDashboard from './pages/CaptainDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';

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
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DynamicDashboard />
              </ProtectedRoute>
            } 
          />
          {/* Navbar routing paths */}
          <Route path="/venues" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/my-games" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/equipment" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/subscriptions" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
          <Route path="/admin/disputes" element={<ProtectedRoute><DynamicDashboard /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;