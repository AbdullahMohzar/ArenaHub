import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ROLE_OPTIONS = [
  {
    value: 'Player',
    label: 'Individual Player',
    description: 'Join games, book solo, build your stats',
    icon: '⚽',
  },
  {
    value: 'Captain',
    label: 'Team Captain',
    description: 'Manage squads, book for teams, rent gear',
    icon: '🛡️',
  },
  {
    value: 'Owner',
    label: 'Venue Owner',
    description: 'List turfs, set pricing, manage bookings',
    icon: '🏢',
  },
];

export function AuthPage({ defaultMode = 'signin' }) {
  const navigate = useNavigate();
  const [isSignUpMode, setIsSignUpMode] = useState(defaultMode === 'signup');
  const [signUpStep, setSignUpStep] = useState(1);

  useEffect(() => {
    if (!isSignUpMode) setSignUpStep(1);
  }, [isSignUpMode]);

  /* ── Login State ── */
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* ── Signup State ── */
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Player',
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userId', data.userId);
        navigate('/dashboard');
      } else {
        setLoginError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch {
      setLoginError('Unable to connect to server. Is the backend running?');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSignupError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate('/login');
      } else {
        setSignupError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setSignupError('Unable to connect to server. Is the backend running?');
    } finally {
      setSignupLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const pw = formData.password;
    if (!pw) return { width: '0%', color: '#27272a', label: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { width: '20%', color: '#52525b', label: 'Weak' },
      { width: '40%', color: '#71717a', label: 'Fair' },
      { width: '60%', color: '#a1a1aa', label: 'Good' },
      { width: '80%', color: '#d4d4d8', label: 'Strong' },
      { width: '100%', color: '#fff', label: 'Excellent' },
    ];
    return levels[Math.min(score, 4)];
  };

  const strength = getPasswordStrength();
  const selectedRole = ROLE_OPTIONS.find((r) => r.value === formData.role);

  /* ── Icons ── */
  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
  const LockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
  const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  );
  const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  );
  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );
  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  );
  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );
  const ChevronRight = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  );
  const ChevronLeft = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  );
  const Spinner = () => (
    <svg className="auth-spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/></svg>
  );

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUpMode ? 'sign-up-mode' : ''}`}>
        {/* ── Forms ── */}
        <div className="auth-forms-container">
          <div className="auth-signin-signup">
            {/* Sign In */}
            <form onSubmit={handleLogin} className="auth-form auth-sign-in-form">
              <h2 className="auth-title">Sign in</h2>

              {loginError && (
                <div className="auth-error">
                  <AlertIcon />
                  {loginError}
                </div>
              )}

              <div className="auth-input-field">
                <MailIcon />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  value={loginData.email}
                  onChange={handleLoginChange}
                />
              </div>

              <div className="auth-input-field">
                <LockIcon />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              <div className="auth-options">
                <label>
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/reset-password">Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="auth-btn auth-solid"
                disabled={loginLoading}
                id="login-submit-button"
              >
                {loginLoading ? (
                  <>
                    <Spinner /> Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <p className="auth-social-text">Or Sign in with social platforms</p>
              <div className="auth-social-media">
                <a href="#" className="auth-social-icon" aria-label="Facebook">f</a>
                <a href="#" className="auth-social-icon" aria-label="Twitter">X</a>
                <a href="#" className="auth-social-icon" aria-label="Google">G</a>
                <a href="#" className="auth-social-icon" aria-label="LinkedIn">in</a>
              </div>

              <p className="auth-switch-text">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUpMode(true); setSignUpStep(1); }}
                >
                  Sign up
                </button>
              </p>
            </form>

            {/* Sign Up */}
            <form onSubmit={handleSignup} className="auth-form auth-sign-up-form">
              <h2 className="auth-title">Sign up</h2>

              {signupError && (
                <div className="auth-error">
                  <AlertIcon />
                  {signupError}
                </div>
              )}

              {signUpStep === 1 ? (
                <div className="auth-role-grid">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      className="auth-role-card"
                      onClick={() => {
                        setFormData({ ...formData, role: role.value });
                        setSignUpStep(2);
                      }}
                      id={`signup-role-${role.value.toLowerCase()}`}
                    >
                      <span className="auth-role-icon">{role.icon}</span>
                      <div className="auth-role-info">
                        <p>{role.label}</p>
                        <p>{role.description}</p>
                      </div>
                      <span className="auth-role-arrow"><ChevronRight /></span>
                    </button>
                  ))}

                  <p className="auth-switch-text" style={{ marginTop: '1.5rem' }}>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setIsSignUpMode(false)}>
                      Sign in
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  <div className="auth-step-header">
                    <button
                      type="button"
                      className="auth-back-btn"
                      onClick={() => setSignUpStep(1)}
                    >
                      <ChevronLeft /> Back
                    </button>
                    <span className="auth-role-badge">
                      {selectedRole?.icon} {selectedRole?.label}
                    </span>
                  </div>

                  <div className="auth-input-field">
                    <UserIcon />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      required
                      value={formData.name}
                      onChange={handleSignupChange}
                    />
                  </div>

                  <div className="auth-input-field">
                    <MailIcon />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      required
                      value={formData.email}
                      onChange={handleSignupChange}
                    />
                  </div>

                  <div className="auth-input-field">
                    <PhoneIcon />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      required
                      value={formData.phone}
                      onChange={handleSignupChange}
                    />
                  </div>

                  <div className="auth-input-field">
                    <LockIcon />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      required
                      value={formData.password}
                      onChange={handleSignupChange}
                    />
                  </div>
                  {formData.password && (
                    <div className="auth-strength-wrap">
                      <div className="auth-strength-bar">
                        <div
                          className="auth-strength-fill"
                          style={{
                            width: strength.width,
                            backgroundColor: strength.color,
                          }}
                        />
                      </div>
                      <div className="auth-strength-label">{strength.label}</div>
                    </div>
                  )}

                  <div className="auth-input-field">
                    <LockIcon />
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleSignupChange}
                    />
                  </div>
                  {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                    <div className="auth-strength-label" style={{ color: '#fca5a5', maxWidth: 380, width: '100%', textAlign: 'left' }}>
                      Passwords don't match
                    </div>
                  )}

                  <button
                    type="submit"
                    className="auth-btn auth-solid"
                    disabled={
                      signupLoading ||
                      (formData.confirmPassword && formData.confirmPassword !== formData.password)
                    }
                    id="signup-submit-button"
                  >
                    {signupLoading ? (
                      <>
                        <Spinner /> Creating Account...
                      </>
                    ) : (
                      'Sign up'
                    )}
                  </button>

                  <p className="auth-switch-text">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setIsSignUpMode(false)}>
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </form>
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="auth-panels-container">
          <div className="auth-panel auth-left-panel">
            <div className="auth-content">
              <div className="auth-panel-brand">
                <span className="auth-panel-logo">A</span>
                <span>ARENA<span className="auth-muted">HUB</span></span>
              </div>
              <h3>New here?</h3>
              <p>Join the platform that's redefining sports booking.</p>

              <div className="auth-panel-features">
                {[
                  { icon: '⚡', text: 'Instant booking with real-time availability' },
                  { icon: '💳', text: 'Digital wallet — cashless, seamless payments' },
                  { icon: '🏆', text: 'Join public games or host your own' },
                ].map((f) => (
                  <div key={f.text} className="auth-panel-feature">
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="auth-panel-stats">
                <div className="auth-panel-stat">
                  <strong>2,500+</strong>
                  <span>Active Venues</span>
                </div>
                <div className="auth-panel-stat">
                  <strong>50K+</strong>
                  <span>Players</span>
                </div>
              </div>

              <button
                className="auth-btn auth-transparent"
                onClick={() => { setIsSignUpMode(true); setSignUpStep(1); }}
              >
                Sign up
              </button>
            </div>
          </div>

          <div className="auth-panel auth-right-panel">
            <div className="auth-content">
              <div className="auth-panel-brand">
                <span className="auth-panel-logo">A</span>
                <span>ARENA<span className="auth-muted">HUB</span></span>
              </div>
              <h3>One of us?</h3>
              <p>Welcome back. Sign in to book your next game and hit the pitch.</p>

              <div className="auth-panel-stats">
                <div className="auth-panel-stat">
                  <strong>15K+</strong>
                  <span>Monthly Games</span>
                </div>
                <div className="auth-panel-stat">
                  <strong>4.9★</strong>
                  <span>App Rating</span>
                </div>
              </div>

              <button
                className="auth-btn auth-transparent"
                onClick={() => setIsSignUpMode(false)}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800&display=swap');

        .auth-page {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
        }
        .auth-page *, .auth-page *::before, .auth-page *::after {
          box-sizing: border-box;
        }

        .auth-container {
          position: relative;
          width: 100%;
          background-color: #0a0a0a;
          min-height: 100vh;
          overflow: hidden;
        }

        .auth-forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .auth-signin-signup {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          left: 75%;
          width: 50%;
          transition: 1s 0.7s ease-in-out;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
        }

        .auth-form {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          flex-direction: column;
          padding: 2.5rem 3rem;
          transition: all 0.2s 0.7s;
          overflow-y: auto;
          max-height: 100vh;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
        }
        .auth-form::-webkit-scrollbar { width: 6px; }
        .auth-form::-webkit-scrollbar-track { background: transparent; }
        .auth-form::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        .auth-form.auth-sign-up-form {
          opacity: 0;
          z-index: 1;
        }

        .auth-form.auth-sign-in-form {
          z-index: 2;
        }

        .auth-title {
          font-size: 2.2rem;
          color: #fff;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .auth-input-field {
          max-width: 380px;
          width: 100%;
          background-color: rgba(255,255,255,0.05);
          margin: 8px 0;
          height: 55px;
          border-radius: 55px;
          display: grid;
          grid-template-columns: 15% 85%;
          padding: 0 0.4rem;
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          transition: 0.3s;
        }
        .auth-input-field:focus-within {
          border-color: rgba(255,255,255,0.3);
        }
        .auth-input-field > svg {
          text-align: center;
          line-height: 55px;
          color: #acacac;
          transition: 0.5s;
          margin: auto;
        }
        .auth-input-field input {
          background: none;
          outline: none;
          border: none;
          line-height: 1;
          font-weight: 500;
          font-size: 1rem;
          color: #fff;
          width: 100%;
        }
        .auth-input-field input::placeholder {
          color: #888;
          font-weight: 400;
        }

        .auth-toggle-password {
          position: absolute;
          right: 1.2rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #acacac;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
        }

        .auth-options {
          max-width: 380px;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.75rem 0;
          font-size: 0.85rem;
        }
        .auth-options label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #aaa;
          cursor: pointer;
        }
        .auth-options input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: #fff;
        }
        .auth-options a {
          color: #d4d4d8;
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
        }
        .auth-options a:hover {
          color: #fff;
        }

        .auth-social-text {
          padding: 0.7rem 0;
          font-size: 1rem;
          color: #aaa;
        }
        .auth-social-media {
          display: flex;
          justify-content: center;
        }
        .auth-social-icon {
          height: 46px;
          width: 46px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 0.45rem;
          color: #fff;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: 0.3s;
        }
        .auth-social-icon:hover {
          color: #fff;
          background: rgba(255,255,255,0.1);
          border-color: #fff;
        }

        .auth-btn {
          width: 150px;
          background-color: #fff;
          border: none;
          outline: none;
          height: 49px;
          border-radius: 49px;
          color: #000;
          text-transform: uppercase;
          font-weight: 600;
          margin: 10px 0;
          cursor: pointer;
          transition: 0.5s;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .auth-btn:hover {
          background-color: #e4e4e7;
        }
        .auth-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-switch-text {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #aaa;
        }
        .auth-switch-text button {
          background: none;
          border: none;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          font-family: inherit;
          font-size: inherit;
          padding: 0;
        }

        .auth-panels-container {
          position: absolute;
          height: 100%;
          width: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .auth-container:before {
          content: "";
          position: absolute;
          height: 2000px;
          width: 2000px;
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          background: linear-gradient(-45deg, #27272a 0%, #3f3f46 100%);
          transition: 1.8s ease-in-out;
          border-radius: 50%;
          z-index: 6;
        }

        .auth-panel {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-around;
          text-align: center;
          z-index: 6;
        }
        .auth-left-panel {
          pointer-events: all;
          padding: 3rem 17% 2rem 12%;
        }
        .auth-right-panel {
          pointer-events: none;
          padding: 3rem 12% 2rem 17%;
          align-items: flex-start;
        }

        .auth-panel .auth-content {
          color: #fff;
          transition: transform 0.9s ease-in-out;
          transition-delay: 0.6s;
        }
        .auth-panel h3 {
          font-weight: 600;
          line-height: 1;
          font-size: 1.5rem;
          margin: 0 0 0.75rem;
        }
        .auth-panel p {
          font-size: 0.95rem;
          padding: 0.7rem 0;
          color: rgba(255,255,255,0.8);
          margin: 0;
        }

        .auth-btn.auth-transparent {
          margin: 1.5rem 0 0;
          background: none;
          border: 2px solid #fff;
          width: 130px;
          height: 41px;
          font-weight: 600;
          font-size: 0.8rem;
          color: #fff;
        }
        .auth-btn.auth-transparent:hover {
          background: rgba(255,255,255,0.1);
        }

        .auth-right-panel .auth-content {
          transform: translateX(800px);
        }

        /* Role selection */
        .auth-role-grid {
          max-width: 380px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin: 1rem 0;
        }
        .auth-role-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          color: inherit;
          font-family: inherit;
        }
        .auth-role-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.25);
          transform: scale(1.02);
        }
        .auth-role-icon { font-size: 1.5rem; }
        .auth-role-info p:first-child {
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          margin: 0;
        }
        .auth-role-info p:last-child {
          color: #aaa;
          font-size: 0.75rem;
          margin: 0.25rem 0 0;
        }
        .auth-role-arrow {
          margin-left: auto;
          color: #666;
          display: flex;
        }

        /* Step header */
        .auth-step-header {
          max-width: 380px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .auth-back-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #aaa;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-family: inherit;
          padding: 0.25rem;
          transition: 0.3s;
        }
        .auth-back-btn:hover { color: #fff; }
        .auth-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          font-size: 0.8rem;
          color: #fff;
        }

        /* Strength */
        .auth-strength-wrap {
          max-width: 380px;
          width: 100%;
          margin: 0.25rem 0 0.5rem;
        }
        .auth-strength-bar {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .auth-strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: all 0.5s;
        }
        .auth-strength-label {
          font-size: 0.75rem;
          color: #888;
          margin-top: 0.25rem;
          text-align: right;
        }

        /* Error */
        .auth-error {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 380px;
          width: 100%;
        }

        /* Panel brand */
        .auth-panel-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.1em;
        }
        .auth-panel-logo {
          display: inline-flex;
          width: 2.5rem;
          height: 2.5rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          border: 2px solid rgba(255,255,255,0.7);
          background: #0a0a0a;
          font-size: 1.25rem;
        }
        .auth-muted { color: #a1a1aa; }

        .auth-panel-features {
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .auth-panel-feature {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
        }

        .auth-panel-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin: 1.5rem 0;
        }
        .auth-panel-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .auth-panel-stat strong {
          font-size: 1.25rem;
          color: #fff;
          font-weight: 700;
        }
        .auth-panel-stat span {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
        }

        /* Spinner */
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
        .auth-spinner {
          animation: auth-spin 1s linear infinite;
          width: 1.25rem;
          height: 1.25rem;
        }

        /* ANIMATION */
        .auth-container.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .auth-container.sign-up-mode .auth-left-panel .auth-content {
          transform: translateX(-800px);
        }

        .auth-container.sign-up-mode .auth-signin-signup {
          left: 25%;
        }

        .auth-container.sign-up-mode .auth-form.auth-sign-up-form {
          opacity: 1;
          z-index: 2;
        }

        .auth-container.sign-up-mode .auth-form.auth-sign-in-form {
          opacity: 0;
          z-index: 1;
        }

        .auth-container.sign-up-mode .auth-right-panel .auth-content {
          transform: translateX(0%);
        }

        .auth-container.sign-up-mode .auth-left-panel {
          pointer-events: none;
        }

        .auth-container.sign-up-mode .auth-right-panel {
          pointer-events: all;
        }

        /* Responsive */
        @media (max-width: 870px) {
          .auth-container {
            min-height: 950px;
            height: 100vh;
          }
          .auth-signin-signup {
            width: 100%;
            top: 95%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }
          .auth-signin-signup,
          .auth-container.sign-up-mode .auth-signin-signup {
            left: 50%;
          }
          .auth-panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }
          .auth-panel {
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 2.5rem 8%;
            grid-column: 1 / 2;
          }
          .auth-right-panel {
            grid-row: 3 / 4;
          }
          .auth-left-panel {
            grid-row: 1 / 2;
          }
          .auth-panel .auth-content {
            padding-right: 15%;
            transition: transform 0.9s ease-in-out;
            transition-delay: 0.8s;
          }
          .auth-panel h3 {
            font-size: 1.2rem;
          }
          .auth-panel p {
            font-size: 0.8rem;
            padding: 0.5rem 0;
          }
          .auth-btn.auth-transparent {
            width: 110px;
            height: 35px;
            font-size: 0.7rem;
          }
          .auth-container:before {
            width: 1500px;
            height: 1500px;
            transform: translateX(-50%);
            left: 30%;
            bottom: 68%;
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }
          .auth-container.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 32%;
            right: initial;
          }
          .auth-container.sign-up-mode .auth-left-panel .auth-content {
            transform: translateY(-300px);
          }
          .auth-container.sign-up-mode .auth-right-panel .auth-content {
            transform: translateY(0px);
          }
          .auth-right-panel .auth-content {
            transform: translateY(300px);
          }
          .auth-container.sign-up-mode .auth-signin-signup {
            top: 5%;
            transform: translate(-50%, 0);
          }
          .auth-form {
            padding: 1.5rem;
          }
          .auth-panel-brand { font-size: 1.25rem; margin-bottom: 1rem; }
          .auth-panel-logo { width: 2rem; height: 2rem; font-size: 1rem; }
        }

        @media (max-width: 570px) {
          .auth-form {
            padding: 0 1.5rem;
          }
          .auth-panel .auth-content {
            padding: 0.5rem 1rem;
          }
          .auth-container {
            padding: 0;
          }
          .auth-container:before {
            bottom: 72%;
            left: 50%;
          }
          .auth-container.sign-up-mode:before {
            bottom: 28%;
            left: 50%;
          }
          .auth-title {
            font-size: 1.8rem;
          }
          .auth-panel-features,
          .auth-panel-stats {
            display: none;
          }
          .auth-panel-brand { margin-bottom: 0.5rem; }
        }
      `}</style>
    </div>
  );
}

export default function Login() {
  return <AuthPage defaultMode="signin" />;
}