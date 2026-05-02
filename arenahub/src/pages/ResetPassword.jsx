import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "If an account exists, a reset link will be sent.");
        navigate('/login');
      } else {
        alert(data.error || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('A network error occurred while trying to request password reset.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>Reset Password</h2>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>Enter your email address and we will send you a link to reset your password.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email Address" 
          required 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <button type="submit" style={{ padding: '0.75rem', cursor: 'pointer' }}>Send Reset Link</button>
      </form>
      <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <Link to="/login" style={{ color: 'blue', textDecoration: 'none' }}>Back to Log In</Link>
      </p>
    </div>
  );
};

export default ResetPassword;