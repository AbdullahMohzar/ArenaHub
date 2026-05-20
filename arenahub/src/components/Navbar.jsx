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
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
    <rect x="1" y="1" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="1" className="text-emerald-400" />
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
    if (!isHome) {
      setIsScrolled(false);
      return;
    }

    const onScroll = () => {
      const next = window.scrollY > 20;
      setIsScrolled((current) => (current === next ? current : next));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  /* ── Hero-passed detection ────────────────── */
  useEffect(() => {
    if (!isHome) {
      setHeroPassed(false);
      return;
    }

    const sync = () => {
      const v = document.documentElement.getAttribute('data-home-hero-passed');
      setHeroPassed(v === 'true');
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-home-hero-passed'],
    });

    return () => observer.disconnect();
  }, [isHome]);

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
              className="ah-nav-logo group"
              aria-label="ArenaHub home"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full scale-0 group-hover:scale-150 transition-transform duration-500"></div>
                 <Logo />
              </div>
              <span className="ah-nav-wordmark group-hover:text-emerald-300 transition-colors">ARENAHUB</span>
            </Link>

            {/* Desktop links */}
            <div className="ah-nav-links">
              {navItems.map((item) => {
                const active = !item.path.startsWith('/#') && location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`ah-nav-link ${active ? 'ah-nav-link-active !text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'hover:!text-white'}`}
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
                      className="ah-icon-btn hover:!bg-emerald-500/10 hover:!border-emerald-500/30 transition-all border border-transparent"
                      id="navbar-chat-button"
                      title="Messages"
                      onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-sidebar'))}
                    >
                      <i className="fi fi-rr-comment-alt text-[16px] leading-none mb-0.5"></i>
                      {unreadCount > 0 && (
                        <span className="ah-badge !bg-emerald-500 !text-black">{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                    </button>
                  )}

                  {/* Profile */}
                  <div className="ah-profile-wrap" ref={profileRef}>
                    <button
                      className={`ah-avatar-btn border transition-all ${isProfileOpen ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}
                      id="navbar-profile-button"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                      <span className="ah-avatar !bg-black/40 !text-emerald-400">
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
                          <p className="ah-dropdown-role flex items-center gap-1 font-bold text-emerald-400">
                             <i className="fi fi-rr-circle-user text-xs"></i> {userRole}
                          </p>
                          <p className="ah-dropdown-id">ID: {localStorage.getItem('userId')}</p>
                        </div>
                        <Link
                          to="/dashboard"
                          onClick={() => setIsProfileOpen(false)}
                          className="ah-dropdown-item group"
                        >
                          <i className="fi fi-rr-apps text-emerald-400/70 group-hover:text-emerald-400 transition-colors mr-2"></i>
                          Dashboard
                        </Link>
                        <button
                          id="navbar-logout-button"
                          onClick={handleLogout}
                          className="ah-dropdown-item ah-dropdown-item-btn group"
                        >
                          <i className="fi fi-rr-sign-out-alt text-slate-500 group-hover:text-red-400 transition-colors mr-2"></i>
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
                    className="ah-nav-cta-ghost hover:!text-emerald-400 hover:!bg-emerald-500/10 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    id="navbar-signup-link"
                    to="/signup"
                    className="ah-nav-cta-solid !bg-emerald-400 !text-black hover:!bg-emerald-300 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all font-bold"
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