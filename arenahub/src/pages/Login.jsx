import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Send credentials to your Java backend endpoint (e.g., /api/login)
    console.log("Submitting login:", credentials);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>Welcome Back</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} />
        <input type="password" name="password" placeholder="Password" required onChange={handleChange} />
        <button type="submit" style={{ padding: '0.75rem', cursor: 'pointer' }}>Log In</button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
        <Link to="/reset-password" style={{ color: 'blue', textDecoration: 'none' }}>Forgot Password?</Link>
        <Link to="/signup" style={{ color: 'blue', textDecoration: 'none' }}>Sign Up</Link>
      </div>
    </div>
  );
};

export default Login;