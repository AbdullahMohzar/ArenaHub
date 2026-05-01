import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eaeaea' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          ArenaHub
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/login">
          <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Log In</button>
        </Link>
        <Link to="/signup">
          <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign Up</button>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;