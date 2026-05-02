import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

/* ─────────────────────────────────────────────
   Role-based navigation configuration
   ───────────────────────────────────────────── */
const NAV_CONFIG = {
  GUEST: [
    { label: 'Browse Venues', path: '/venues', icon: '🏟️' },
  ],
  PLAYER: [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  ],
  CAPTAIN: [
    { label: 'Dashboard', path: '/dashboard', icon: '🛡️' },
  ],
  OWNER: [
    { label: 'Dashboard', path: '/dashboard', icon: '🏢' },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/dashboard', icon: '⚙️' },
  ],
};

const ROLE_BADGE = {
  PLAYER: { label: 'Player', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  CAPTAIN: { label: 'Captain', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  OWNER: { label: 'Owner', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  ADMIN: { label: 'Admin', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('GUEST');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);

  // Check auth state on mount and route changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    setIsLoggedIn(!!token);
    setUserRole(role ? role.toUpperCase() : 'GUEST');
  }, [location]);

  // Poll for unread messages (for navbar badge)
  useEffect(() => {
    const fetchUnread = async () => {
      const t = localStorage.getItem('token');
      const r = (localStorage.getItem('userRole') || '').toUpperCase();
      if (!t || r === 'ADMIN') return;
      try {
        const res = await fetch('http://localhost:8080/api/chat/contacts', {
          headers: { 'Authorization': `Bearer ${t}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
        }
      } catch (err) { /* silent */ }
    };
    fetchUnread();
    const poll = setInterval(fetchUnread, 10000);
    return () => clearInterval(poll);
  }, [isLoggedIn]);

  // Scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserRole('GUEST');
    setIsProfileOpen(false);
    navigate('/login');
  };

  const navItems = NAV_CONFIG[userRole] || NAV_CONFIG.GUEST;
  const badge = ROLE_BADGE[userRole];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#050a08]/92 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)] border-b border-emerald-500/15'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <span className="relative">
              <span className="absolute -inset-0.5 rounded-md bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-60 blur-[6px] group-hover:opacity-90 transition-opacity" aria-hidden />
              <span className="relative flex w-9 h-9 items-center justify-center rounded-md border-2 border-emerald-400/90 bg-[#0a1210] font-display text-lg text-emerald-400 shadow-inner">
                A
              </span>
            </span>
            <span className="font-display text-xl text-white tracking-[0.12em]">
              ARENA<span className="text-emerald-400">HUB</span>
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold uppercase tracking-wide transition-all duration-200 border-b-2 ${
                    isActive
                      ? 'text-white bg-white/5 border-emerald-400 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* ── Right Side: Auth/Profile ── */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              /* ── Logged-in: Role Badge + Profile Dropdown ── */
              <div className="flex items-center gap-3">
                {badge && (
                  <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-display tracking-[0.15em] border-2 uppercase ${badge.color}`}>
                    {badge.label}
                  </span>
                )}

                {/* Chat Button — opens global chat sidebar */}
                {userRole !== 'ADMIN' && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-sidebar'))}
                    className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-500/20 transition-all group"
                    id="navbar-chat-button"
                    title="Messages"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    id="navbar-profile-button"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {(localStorage.getItem('userRole') || 'U')[0].toUpperCase()}
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl glass shadow-2xl shadow-black/40 py-2 animate-fade-in-up">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-semibold text-white">Account</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {userRole} • ID: {localStorage.getItem('userId')}
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span>📊</span> Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                        id="navbar-logout-button"
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Guest: Login / Sign Up Buttons ── */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  id="navbar-login-link"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold uppercase tracking-wide hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-[0_0_24px_-4px_rgba(16,185,129,0.65)] border border-emerald-400/30"
                  id="navbar-signup-link"
                >
                  Sign Up Free
                </Link>
              </div>
            )}

            {/* ── Mobile Hamburger ── */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              id="navbar-mobile-toggle"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/5 animate-fade-in-up">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold uppercase tracking-wide transition-all border-l-4 ${
                    isActive
                      ? 'bg-white/10 text-white border-emerald-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {!isLoggedIn && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold uppercase tracking-wide border border-emerald-400/30 shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)]"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
            {isLoggedIn && (
              <div className="pt-3 border-t border-white/10 space-y-1">
                {userRole !== 'ADMIN' && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('toggle-chat-sidebar')); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5"
                  >
                    <span>💬</span> Messages
                    {unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10"
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;