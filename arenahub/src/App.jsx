import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Router>
      {/* The Navbar sits outside the Routes so it always renders */}
      <Navbar />
      
      <main>
        <Routes>
          {/* Redirect the base URL to the login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Define your page routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;