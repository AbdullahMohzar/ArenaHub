import React, { useEffect } from 'react';
import Navbar from './Navbar';
import ChatSidebar from './ChatSidebar';
import { useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CursorFollower from './CursorFollower';

const Layout = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 80,
    });
  }, []);

  useEffect(() => {
    // Only set role if we are logged in, otherwise default
    const role = localStorage.getItem('userRole');
    if (role && location.pathname !== '/login' && location.pathname !== '/signup') {
      // Capitalize first letter: Player, Captain, Owner, Admin
      const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      document.documentElement.setAttribute('data-role', formattedRole);
    } else {
      document.documentElement.removeAttribute('data-role');
    }

    document.documentElement.setAttribute('data-page', location.pathname === '/' ? 'home' : 'app');
    AOS.refreshHard();
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      {location.pathname === '/' ? <CursorFollower /> : null}
      {/* The Kinetic Sidebar replaces the old ChatSidebar or works alongside it. 
          For now, we just include the old one, but we'll apply kinetic styles to it soon. */}
      <ChatSidebar />
      <main className="pt-16 min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </>
  );
};

// Also export AnimatePresence for the wrapper
import { AnimatePresence } from 'framer-motion';

export default Layout;
