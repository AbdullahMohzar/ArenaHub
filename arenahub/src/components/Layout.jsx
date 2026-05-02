import React, { useEffect } from 'react';
import Navbar from './Navbar';
import ChatSidebar from './ChatSidebar';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

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
  }, [location.pathname]);

  return (
    <>
      {/* Massive Decorative Background Number */}
      <div className="fixed top-20 right-10 -z-10 pointer-events-none opacity-20 select-none hidden md:block">
        <span className="text-[15rem] font-black leading-none text-zinc-800 tracking-tighter">
          {location.pathname === '/dashboard' ? '01' : '0X'}
        </span>
      </div>

      <Navbar />
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
