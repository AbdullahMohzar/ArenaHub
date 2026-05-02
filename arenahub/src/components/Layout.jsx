import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import ChatSidebar from './ChatSidebar';

const authPaths = ['/login', '/signup', '/reset-password'];

const getPageTransition = (pathname) =>
  authPaths.includes(pathname)
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
      };

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role && location.pathname !== '/login' && location.pathname !== '/signup') {
      const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      document.documentElement.setAttribute('data-role', formattedRole);
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [location.pathname]);

  const decoKey =
    location.pathname === '/dashboard'
      ? '01'
      : authPaths.includes(location.pathname)
        ? '◆'
        : '0X';

  const pageMotion = getPageTransition(location.pathname);

  return (
    <>
      <motion.div
        className="fixed top-20 right-6 -z-10 pointer-events-none opacity-[0.14] select-none hidden md:block"
        aria-hidden
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0.14, x: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="text-[15rem] font-display leading-none text-zinc-800/90 select-none">
          {decoKey}
        </span>
      </motion.div>

      <Navbar />
      <ChatSidebar />
      <main className="pt-16 min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            {...pageMotion}
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
