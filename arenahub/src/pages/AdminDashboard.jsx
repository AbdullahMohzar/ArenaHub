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
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-rose-500">🛡️</span> Admin Console
          </h1>
          <p className="text-slate-400 mt-1">System-wide monitoring, user governance, and financial dispute resolution.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}>👥 User Governance</button>
          <button onClick={() => setActiveTab('disputes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'disputes' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}>⚖️ Dispute & Refunds</button>
        </div>

        {/* ═══ TAB: Users ═══ */}
        {activeTab === 'users' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl overflow-hidden border border-rose-500/10">
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
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'Admin' ? 'bg-rose-500/10 text-rose-400' : u.role === 'Owner' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'BANNED' ? 'bg-rose-500 text-white' : 'text-emerald-400'}`}>
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{u.createdAt?.substring(0, 10)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {u.status !== 'BANNED' && u.role !== 'Admin' && (
                            <button onClick={() => handleUserAction(u.userId, 'BAN')} className="px-3 py-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold">Ban User</button>
                          )}
                          {u.role === 'Player' && (
                            <button onClick={() => handleUserAction(u.userId, 'PROMOTE_OWNER')} className="px-3 py-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs font-bold">Make Owner</button>
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
                <div key={d.bookingId} className="glass rounded-2xl p-6 border-l-4 border-rose-500 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Refund Pending: {d.turfName}</h3>
                      <p className="text-sm text-slate-400">Cancelled Booking • {d.date}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-bold">CANCELLED</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg mb-4 text-sm">
                    <p className="text-slate-300">User: <strong className="text-white">{d.userName}</strong> (ID: {d.userId})</p>
                    <p className="text-slate-300">Amount to Refund: <strong className="text-rose-400 text-lg">Rs. {d.price}</strong></p>
                  </div>
                  <button onClick={() => processRefund(d.bookingId, d.userId, d.price)} disabled={processingId === d.bookingId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold disabled:opacity-50 hover:from-rose-400 hover:to-rose-500 transition-all flex justify-center items-center gap-2">
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