import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';

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
      <Navbar />
      <main className="pt-16">
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
        </Routes>
      </main>
    </Router>
  );
}

export default App;