import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import ChatSidebar from './ChatSidebar';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CursorFollower from './CursorFollower';

const Layout = () => {
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
          <motion.div
            key={location.pathname}
            className="min-h-[calc(100vh-4rem)]"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
};

export default Layout;
