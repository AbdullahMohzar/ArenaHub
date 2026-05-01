import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Player' // Default role
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    // TODO: Send formData to your pure Java backend endpoint (e.g., /api/register)
    // Upon success, the system will create the user account, assign the selected role, and redirect the user to the role-appropriate dashboard[cite: 1].
    console.log("Submitting registration:", formData);
    
    // Once your backend is connected, you can trigger the redirect here:
    // navigate('/dashboard'); 
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>Create an Account</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" name="name" placeholder="Full Name" required onChange={handleChange} />
        <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} />
        <input type="tel" name="phone" placeholder="Phone Number" required onChange={handleChange} />
        
        <select name="role" value={formData.role} onChange={handleChange} required>
          <option value="Player">Individual Player</option>
          <option value="Captain">Team Captain</option>
          <option value="Owner">Turf Owner</option>
        </select>

        <input type="password" name="password" placeholder="Password" required onChange={handleChange} />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" required onChange={handleChange} />
        
        <button type="submit" style={{ padding: '0.75rem', cursor: 'pointer' }}>Register</button>
      </form>
      <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'blue', textDecoration: 'none' }}>Log In</Link>
      </p>
    </div>
  );
};

export default Signup;
