import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8080';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  const [activeTab, setActiveTab] = useState('venues');
  const [myTurfs, setMyTurfs] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  // New Venue Form
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '' });

  // Notifications
  const [toasts, setToasts] = useState([]);
  const previousBookingIdsRef = useRef(new Set());
  const isFirstFetchRef = useRef(true);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTurfs = async () => {
    try {
      const res = await fetch(`${API}/api/turfs?ownerId=${userId}`);
      if (res.ok) setMyTurfs(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API}/api/bookings?userId=${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        
        // Detect new bookings
        if (!isFirstFetchRef.current) {
          const currentIds = new Set(data.map(b => b.BookingID));
          const prevIds = previousBookingIdsRef.current;
          currentIds.forEach(id => {
            if (!prevIds.has(id)) {
              const newB = data.find(b => b.BookingID === id);
              setToasts(p => [...p, { id: Date.now(), msg: `New Booking: ${newB.TurfName} on ${newB.BookingDate}` }]);
            }
          });
        }
        previousBookingIdsRef.current = new Set(data.map(b => b.BookingID));
        isFirstFetchRef.current = false;

        setOwnerBookings(data);
        calculateRevenue(data);
      }
    } catch (err) { console.error(err); }
  };

  const calculateRevenue = (bookings) => {
    const now = new Date();
    const rev = bookings.reduce((sum, b) => {
      if (b.Status !== 'CONFIRMED' || b.PaymentStatus !== 'PAID') return sum;
      const bDate = new Date(b.BookingDate);
      if (bDate.getFullYear() === now.getFullYear() && bDate.getMonth() === now.getMonth()) {
        const h = parseInt(b.EndTime) - parseInt(b.StartTime);
        return sum + (h * b.PricePerHour);
      }
      return sum;
    }, 0);
    setMonthlyRevenue(rev);
  };

  useEffect(() => {
    if (!userId) return navigate('/login');
    fetchTurfs();
    fetchBookings();
    const poll = setInterval(fetchBookings, 30000); // 30s polling
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 4000);
    return () => clearTimeout(t);
  }, [toasts]);

  // UC-02: Add Venue
  const submitVenue = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'POST', headers,
        body: JSON.stringify({ ownerId: parseInt(userId), ...venueForm, pricePerHour: parseFloat(venueForm.pricePerHour) })
      });
      if (res.ok) {
        setShowVenueForm(false);
        setVenueForm({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '' });
        fetchTurfs();
      }
    } catch (err) { console.error(err); }
  };

  // UC-03: Toggle Surge Pricing
  const toggleSurgePricing = async (turfId, currentMultiplier) => {
    const newMultiplier = currentMultiplier > 1.0 ? 1.0 : 1.2;
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'PUT', headers,
        body: JSON.stringify({ turfId, action: 'PRICING', weekendPriceMultiplier: newMultiplier })
      });
      if (res.ok) fetchTurfs();
    } catch (err) { console.error(err); }
  };

  // UC-10: Set Maintenance Lock
  const [maintenanceForm, setMaintenanceForm] = useState({ turfId: null, start: '', end: '' });
  const submitMaintenance = async (turfId) => {
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'PUT', headers,
        body: JSON.stringify({ turfId, action: 'MAINTENANCE', start: maintenanceForm.start, end: maintenanceForm.end })
      });
      if (res.ok) {
        setMaintenanceForm({ turfId: null, start: '', end: '' });
        fetchTurfs();
      }
    } catch (err) { console.error(err); }
  };
  const clearMaintenance = async (turfId) => {
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'PUT', headers, body: JSON.stringify({ turfId, action: 'MAINTENANCE', start: null, end: null })
      });
      if (res.ok) fetchTurfs();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-arena-950">
      {/* Toast Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="glass rounded-lg p-4 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 text-white animate-fade-in-up flex items-center gap-3">
            <span className="text-xl">🛎️</span> {t.msg}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Owner Dashboard
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" /> Live
              </span>
            </h1>
            <p className="text-slate-400 mt-1">Manage venues, pricing, and monitor real-time bookings.</p>
          </div>
          <div className="glass rounded-2xl px-6 py-4 flex flex-col min-w-[200px]">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Monthly Revenue</span>
            <span className="text-2xl font-bold text-emerald-400">Rs. {monthlyRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
          <button onClick={() => setActiveTab('venues')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'venues' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}>🏢 Venue Manager</button>
          <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}>📅 Visual Calendar</button>
        </div>

        {/* ═══ TAB: Venue Manager ═══ */}
        {activeTab === 'venues' && (
          <div className="animate-fade-in-up space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">My Properties</h2>
              <button onClick={() => setShowVenueForm(!showVenueForm)} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all">
                {showVenueForm ? 'Close Form' : '+ Add New Venue'}
              </button>
            </div>

            {showVenueForm && (
              <form onSubmit={submitVenue} className="glass rounded-2xl p-6 border border-indigo-500/30 animate-fade-in-up">
                <h3 className="text-lg font-bold text-white mb-4">List a New Turf</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input required placeholder="Venue Name" value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none" />
                  <select value={venueForm.sportType} onChange={e => setVenueForm({...venueForm, sportType: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none">
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Tennis">Tennis</option>
                  </select>
                  <input required type="number" placeholder="Price per Hour (Rs.)" value={venueForm.pricePerHour} onChange={e => setVenueForm({...venueForm, pricePerHour: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none" />
                  <input placeholder="Location / Address" value={venueForm.location} onChange={e => setVenueForm({...venueForm, location: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none" />
                </div>
                <textarea placeholder="Description" value={venueForm.description} onChange={e => setVenueForm({...venueForm, description: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none mb-4" rows="2" />
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-all">List Property</button>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {myTurfs.map(t => (
                <div key={t.TurfID} className="glass rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.Name}</h3>
                      <p className="text-sm text-slate-400">{t.Location || 'No location set'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-400">Rs. {t.PricePerHour}<span className="text-sm text-slate-500">/hr</span></p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.Status === 'MAINTENANCE' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{t.Status}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/10">
                    {/* Surge Pricing Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-sm font-semibold text-white">Weekend Surge Pricing</p>
                        <p className="text-xs text-slate-400">Automatically add +20% to weekend bookings</p>
                      </div>
                      <button onClick={() => toggleSurgePricing(t.TurfID, t.WeekendPriceMultiplier)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.WeekendPriceMultiplier > 1.0 ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.WeekendPriceMultiplier > 1.0 ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Maintenance Lock */}
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">Maintenance Lock</p>
                          <p className="text-xs text-slate-400">Prevent bookings during specific dates</p>
                        </div>
                        {t.Status === 'MAINTENANCE' && (
                          <button onClick={() => clearMaintenance(t.TurfID)} className="text-xs text-rose-400 hover:text-rose-300">Clear Lock</button>
                        )}
                      </div>
                      {t.Status === 'MAINTENANCE' ? (
                        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                          Locked from: {t.MaintenanceLockStart} to {t.MaintenanceLockEnd}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="date" className="flex-1 px-3 py-1.5 bg-arena-950 border border-white/10 rounded text-slate-300 text-sm" 
                            onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, start: e.target.value})} />
                          <span className="text-slate-500 text-xs">to</span>
                          <input type="date" className="flex-1 px-3 py-1.5 bg-arena-950 border border-white/10 rounded text-slate-300 text-sm" 
                            onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, end: e.target.value})} />
                          <button onClick={() => submitMaintenance(t.TurfID)} disabled={!maintenanceForm.start || !maintenanceForm.end || maintenanceForm.turfId !== t.TurfID}
                            className="px-3 py-1.5 bg-slate-700 text-white rounded text-sm disabled:opacity-50 hover:bg-slate-600">Lock</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: Visual Calendar ═══ */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Upcoming Schedule</h2>
              <div className="space-y-8">
                {/* Group bookings by Date */}
                {Object.entries(
                  ownerBookings.reduce((acc, b) => {
                    if (b.Status === 'CONFIRMED') {
                      (acc[b.BookingDate] = acc[b.BookingDate] || []).push(b);
                    }
                    return acc;
                  }, {})
                ).sort(([d1], [d2]) => new Date(d1) - new Date(d2)).map(([date, bks]) => (
                  <div key={date}>
                    <h3 className="text-lg font-bold text-emerald-400 mb-3 border-b border-white/10 pb-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bks.map(b => (
                        <div key={b.BookingID} className="p-4 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                          <p className="text-sm font-semibold text-white">{b.TurfName}</p>
                          <p className="text-xl font-bold text-emerald-400 my-1">{b.StartTime.substring(0,5)} <span className="text-sm text-slate-500 font-normal">to</span> {b.EndTime.substring(0,5)}</p>
                          <div className="flex justify-between items-center text-xs text-slate-400">
                            <span className="uppercase tracking-wide">{b.Visibility} Game</span>
                            {b.PaymentStatus === 'PAID' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">PAID</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {ownerBookings.filter(b => b.Status === 'CONFIRMED').length === 0 && (
                  <p className="text-slate-500 text-center py-8">No confirmed bookings to display.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;