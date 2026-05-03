import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "If an account exists, a reset link will be sent.");
        navigate('/login');
      } else {
        alert(data.error || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('A network error occurred while trying to request password reset.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-xl p-8 border border-white/10 shadow-2xl">
        <p className="sports-kicker mb-2">Account recovery</p>
        <h1 className="font-display text-4xl text-white uppercase tracking-wide mb-2">Reset access</h1>
        <p className="text-slate-400 text-sm mb-8">
          Drop the email tied to your roster. We&apos;ll send a link to pick a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-[#0a0a0a] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-md bg-white text-black font-bold text-sm uppercase tracking-widest border border-white/30 shadow-[0_0_24px_-6px_rgba(255,255,255,0.15)] hover:bg-zinc-200 transition-all"
          >
            Send reset link
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link to="/login" className="text-zinc-300 hover:text-white font-semibold">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
