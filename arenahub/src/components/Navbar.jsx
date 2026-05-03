import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';

/* ── Role-based nav config ───────────────────── */
const NAV_CONFIG = {
  GUEST: [
    { label: 'Why ArenaHub', path: '/#why' },
    { label: 'Features',     path: '/#features' },
    { label: 'Venues',       path: '/venues' },
    { label: 'Contact',      path: '/#contact' },
  ],
  PLAYER:  [{ label: 'Home', path: '/' }, { label: 'Dashboard', path: '/dashboard' }],
  CAPTAIN: [{ label: 'Home', path: '/' }, { label: 'Dashboard', path: '/dashboard' }],
  OWNER:   [{ label: 'Home', path: '/' }, { label: 'Dashboard', path: '/dashboard' }],
  ADMIN:   [{ label: 'Home', path: '/' }, { label: 'Dashboard', path: '/dashboard' }],
};

/* ── ArenaHub logo mark ──────────────────────── */
const Logo = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="24" height="24" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity="0.7"/>
    <path d="M6 19L13 7L20 19" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
    <path d="M8.5 14.5H17.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

const Navbar = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const navRef      = useRef(null);
  const profileRef  = useRef(null);

  const [isLoggedIn,       setIsLoggedIn]       = useState(false);
  const [userRole,         setUserRole]         = useState('GUEST');
  const [isMobileOpen,     setIsMobileOpen]     = useState(false);
  const [isProfileOpen,    setIsProfileOpen]    = useState(false);
  const [isScrolled,       setIsScrolled]       = useState(false);
  const [heroPassed,       setHeroPassed]       = useState(false);
  const [unreadCount,      setUnreadCount]      = useState(0);

  const isHome = location.pathname === '/';

  /* ── Auth sync ────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('userRole');
    setIsLoggedIn(!!token);
    setUserRole(role ? role.toUpperCase() : 'GUEST');
  }, [location]);

  /* ── Scroll detection ─────────────────────── */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Hero-passed detection ────────────────── */
  useEffect(() => {
    const sync = () => {
      const v = document.documentElement.getAttribute('data-home-hero-passed');
      setHeroPassed(v === 'true');
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    const t = setInterval(sync, 300);
    return () => { window.removeEventListener('scroll', sync); clearInterval(t); };
  }, []);

  /* ── GSAP pill morph when pill state changes ── */
  useEffect(() => {
    const el = navRef.current;
    if (!el || !isHome) return;

    if (heroPassed) {
      // morph into centered pill
      gsap.to(el, {
        duration: 0.55,
        ease: 'expo.out',
        '--pill-padding': '0px 24px',
        '--pill-radius': '999px',
        '--pill-max-width': '820px',
        '--pill-margin': '16px auto 0',
        '--pill-border': '1px solid rgba(255,255,255,0.14)',
        '--pill-shadow': '0 8px 40px rgba(0,0,0,0.55)',
      });
    } else {
      gsap.to(el, {
        duration: 0.55,
        ease: 'expo.out',
        '--pill-padding': '0px 0px',
        '--pill-radius': '0px',
        '--pill-max-width': '100%',
        '--pill-margin': '0px auto 0',
        '--pill-border': '1px solid transparent',
        '--pill-shadow': 'none',
      });
    }
  }, [heroPassed, isHome]);

  /* ── Unread messages poll ─────────────────── */
  useEffect(() => {
    const fetchUnread = async () => {
      const t = localStorage.getItem('token');
      const r = (localStorage.getItem('userRole') || '').toUpperCase();
      if (!t || r === 'ADMIN') return;
      try {
        const res = await fetch('http://localhost:8080/api/chat/contacts', {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
        }
      } catch { /* silent */ }
    };
    fetchUnread();
    const poll = setInterval(fetchUnread, 10000);
    return () => clearInterval(poll);
  }, [isLoggedIn]);

  /* ── Close profile on outside click ──────── */
  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserRole('GUEST');
    setIsProfileOpen(false);
    navigate('/');
  };

  const navItems  = NAV_CONFIG[userRole] || NAV_CONFIG.GUEST;
  const pillMode  = isHome && heroPassed;
  const bgBlur    = isScrolled || !isHome;

  return (
    <>
      {/* ════ Fixed outer wrapper ════ */}
      <div
        className={`ah-nav-outer ${pillMode ? 'ah-nav-pill-mode' : ''}`}
        role="banner"
      >
        {/* ════ Nav bar / pill ════ */}
        <nav
          ref={navRef}
          className={`ah-nav ${pillMode ? 'ah-nav-pill' : ''} ${bgBlur ? 'ah-nav-blur' : ''}`}
          aria-label="Main navigation"
        >
          <div className="ah-nav-inner">

            {/* Logo */}
            <Link
              to={isLoggedIn ? '/dashboard' : '/'}
              className="ah-nav-logo"
              aria-label="ArenaHub home"
            >
              <Logo />
              <span className="ah-nav-wordmark">ARENAHUB</span>
            </Link>

            {/* Desktop links */}
            <div className="ah-nav-links">
              {navItems.map((item) => {
                const active = !item.path.startsWith('/#') && location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`ah-nav-link ${active ? 'ah-nav-link-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="ah-nav-right">
              {isLoggedIn ? (
                <>
                  {/* Chat */}
                  {userRole !== 'ADMIN' && (
                    <button
                      className="ah-icon-btn"
                      id="navbar-chat-button"
                      title="Messages"
                      onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-sidebar'))}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="ah-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                    </button>
                  )}

                  {/* Profile */}
                  <div className="ah-profile-wrap" ref={profileRef}>
                    <button
                      className="ah-avatar-btn"
                      id="navbar-profile-button"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                      <span className="ah-avatar">
                        {(localStorage.getItem('userRole') || 'U')[0].toUpperCase()}
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        className={`ah-chevron ${isProfileOpen ? 'rotate-180' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isProfileOpen && (
                      <div className="ah-dropdown">
                        <div className="ah-dropdown-header">
                          <p className="ah-dropdown-role">{userRole}</p>
                          <p className="ah-dropdown-id">ID: {localStorage.getItem('userId')}</p>
                        </div>
                        <Link
                          to="/dashboard"
                          onClick={() => setIsProfileOpen(false)}
                          className="ah-dropdown-item"
                        >
                          Dashboard
                        </Link>
                        <button
                          id="navbar-logout-button"
                          onClick={handleLogout}
                          className="ah-dropdown-item ah-dropdown-item-btn"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    id="navbar-login-link"
                    to="/login"
                    className="ah-nav-cta-ghost"
                  >
                    Log in
                  </Link>
                  <Link
                    id="navbar-signup-link"
                    to="/signup"
                    className="ah-nav-cta-solid"
                  >
                    Join
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                id="navbar-mobile-toggle"
                className="ah-hamburger"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle menu"
              >
                <span className={`ah-ham-line ${isMobileOpen ? 'ah-ham-top-open' : ''}`} />
                <span className={`ah-ham-line ${isMobileOpen ? 'ah-ham-mid-open' : ''}`} />
                <span className={`ah-ham-line ${isMobileOpen ? 'ah-ham-bot-open' : ''}`} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* ════ Mobile drawer ════ */}
      <div className={`ah-mobile-drawer ${isMobileOpen ? 'ah-mobile-open' : ''}`}>
        <div className="ah-mobile-inner">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className="ah-mobile-link"
            >
              {item.label}
            </Link>
          ))}

          {!isLoggedIn && (
            <div className="ah-mobile-auth">
              <Link
                to="/login"
                onClick={() => setIsMobileOpen(false)}
                className="ah-mobile-auth-ghost"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileOpen(false)}
                className="ah-mobile-auth-solid"
              >
                Join ArenaHub
              </Link>
            </div>
          )}

          {isLoggedIn && (
            <div className="ah-mobile-auth">
              {userRole !== 'ADMIN' && (
                <button
                  className="ah-mobile-auth-ghost"
                  onClick={() => {
                    setIsMobileOpen(false);
                    window.dispatchEvent(new CustomEvent('toggle-chat-sidebar'));
                  }}
                >
                  Messages {unreadCount > 0 && `(${unreadCount})`}
                </button>
              )}
              <button
                className="ah-mobile-auth-ghost"
                onClick={() => { setIsMobileOpen(false); handleLogout(); }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;