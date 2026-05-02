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
    { label: 'Browse Turfs', path: '/venues', icon: '🏟️' },
    { label: 'Joined Games', path: '/my-games', icon: '⚽' },
    { label: 'My Wallet', path: '/wallet', icon: '💰' },
    { label: 'My Bookings', path: '/dashboard', icon: '📋' },
  ],
  CAPTAIN: [
    { label: 'Squad Hub', path: '/dashboard', icon: '🛡️' },
    { label: 'Browse Turfs', path: '/venues', icon: '🏟️' },
    { label: 'Rent Equipment', path: '/equipment', icon: '🎽' },
    { label: 'Subscriptions', path: '/subscriptions', icon: '🔄' },
  ],
  OWNER: [
    { label: 'Venue Manager', path: '/dashboard', icon: '🏢' },
    { label: 'Calendar', path: '/calendar', icon: '📅' },
    { label: 'Pricing Rules', path: '/pricing', icon: '💲' },
  ],
  ADMIN: [
    { label: 'System Control', path: '/dashboard', icon: '⚙️' },
    { label: 'User Accounts', path: '/admin/users', icon: '👥' },
    { label: 'Disputes', path: '/admin/disputes', icon: '⚖️' },
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
  const profileRef = useRef(null);

  // Check auth state on mount and route changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    setIsLoggedIn(!!token);
    setUserRole(role ? role.toUpperCase() : 'GUEST');
  }, [location]);

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
          ? 'bg-arena-950/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
              A
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Arena<span className="text-emerald-400">Hub</span>
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                  <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                    {badge.label}
                  </span>
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                  className="block w-full text-center px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
            {isLoggedIn && (
              <div className="pt-3 border-t border-white/10">
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