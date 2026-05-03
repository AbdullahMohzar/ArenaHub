import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = 'http://localhost:8080';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [activeTab, setActiveTab] = useState('users');
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (location.pathname === '/admin/disputes') setActiveTab('disputes');
    else if (location.pathname === '/admin/users' || location.pathname === '/dashboard') setActiveTab('users');
  }, [location.pathname]);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchUsers();
    fetchDisputes();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers });
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchDisputes = async () => {
    try {
      const res = await fetch(`${API}/api/admin/disputes`, { headers });
      if (res.ok) setDisputes(await res.json());
    } catch (err) { console.error(err); }
  };

  // UC-14: Manage Users (Ban / Promote)
  const handleUserAction = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: 'PUT', headers,
        body: JSON.stringify({ userId, action })
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  // UC-15: Process Refund
  const processRefund = async (bookingId, userId, amount) => {
    if (!window.confirm(`Refund Rs. ${amount} to User ID ${userId}?`)) return;
    setProcessingId(bookingId);
    try {
      const res = await fetch(`${API}/api/admin/refund`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId, userId, amount })
      });
      if (res.ok) {
        alert('Refund processed successfully and added to wallet.');
        fetchDisputes();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) { console.error(err); }
    finally { setProcessingId(null); }
  };

  return (
    <div className="min-h-screen bg-arena-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col mb-8">
          <p className="sports-kicker mb-1 text-white/80">League office</p>
          <h1 className="font-display text-4xl sm:text-5xl text-white uppercase tracking-wide flex items-center gap-3">
            <span className="text-zinc-300 not-italic">🛡️</span> Commish console
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">League-wide ops — rosters, bans, and money plays when matches get voided.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 p-1.5 glass rounded-lg mb-6 w-fit ring-1 ring-white/5">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'users' ? 'bg-white/10 text-white border-white/50 shadow-[0_0_20px_-8px_rgba(255,255,255,0.12)]' : 'text-slate-400 hover:text-white border-transparent'}`}>👥 User Governance</button>
          <button onClick={() => setActiveTab('disputes')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'disputes' ? 'bg-white/10 text-white border-white/50 shadow-[0_0_20px_-8px_rgba(255,255,255,0.12)]' : 'text-slate-400 hover:text-white border-transparent'}`}>⚖️ Dispute & Refunds</button>
        </div>

        {/* ═══ TAB: Users ═══ */}
        {activeTab === 'users' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl overflow-hidden border border-white/15">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Registered</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map(u => (
                      <tr key={u.userId} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'Admin' ? 'bg-white/15 text-zinc-100' : u.role === 'Owner' ? 'bg-white/10 text-zinc-200' : 'bg-slate-700 text-slate-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'BANNED' ? 'bg-zinc-700 text-white' : 'text-zinc-200'}`}>
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{u.createdAt?.substring(0, 10)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {u.status !== 'BANNED' && u.role !== 'Admin' && (
                            <button onClick={() => handleUserAction(u.userId, 'BAN')} className="px-3 py-1.5 rounded bg-white/10 text-zinc-200 border border-white/25 hover:bg-white/15 text-xs font-bold">Ban User</button>
                          )}
                          {u.role === 'Player' && (
                            <button onClick={() => handleUserAction(u.userId, 'PROMOTE_OWNER')} className="px-3 py-1.5 rounded bg-white/10 text-zinc-200 border border-white/25 hover:bg-white/15 text-xs font-bold">Make Owner</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Disputes ═══ */}
        {activeTab === 'disputes' && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {disputes.map(d => (
                <div key={d.bookingId} className="glass rounded-2xl p-6 border-l-4 border-white/50 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Refund Pending: {d.turfName}</h3>
                      <p className="text-sm text-slate-400">Cancelled Booking • {d.date}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-white/10 text-zinc-300 text-xs font-bold">CANCELLED</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg mb-4 text-sm">
                    <p className="text-slate-300">User: <strong className="text-white">{d.userName}</strong> (ID: {d.userId})</p>
                    <p className="text-slate-300">Amount to Refund: <strong className="text-zinc-200 text-lg">Rs. {d.price}</strong></p>
                  </div>
                  <button onClick={() => processRefund(d.bookingId, d.userId, d.price)} disabled={processingId === d.bookingId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-white to-zinc-200 text-black font-bold disabled:opacity-50 hover:from-zinc-200 hover:to-zinc-300 transition-all flex justify-center items-center gap-2">
                    {processingId === d.bookingId ? 'Processing Transaction...' : 'Process Refund to Wallet'}
                  </button>
                </div>
              ))}
              {disputes.length === 0 && (
                <div className="col-span-full glass p-12 text-center rounded-2xl border border-white/10">
                  <p className="text-slate-400 text-lg">No pending refunds or cancelled bookings require attention.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;