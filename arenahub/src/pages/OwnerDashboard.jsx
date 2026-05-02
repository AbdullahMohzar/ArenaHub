import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = 'http://localhost:8080';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  const [activeTab, setActiveTab] = useState('venues');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/calendar') setActiveTab('calendar');
    else if (location.pathname === '/pricing') setActiveTab('pricing');
    else if (location.pathname === '/dashboard') setActiveTab('venues');
  }, [location.pathname]);
  const [myTurfs, setMyTurfs] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  // New Venue Form
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '', imageFiles: [] });
  
  // Edit Venue
  const [editingTurfId, setEditingTurfId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '', imageFiles: [] });

  // Chat Inbox replaced by global ChatSidebar
  const openChatSidebar = (contactUserId, contactName, contactRole) => {
    window.dispatchEvent(new CustomEvent('open-chat-sidebar', {
      detail: { contactUserId, contactName, contactRole }
    }));
  };

  // Notifications
  const [toasts, setToasts] = useState([]);
  const previousBookingIdsRef = useRef(new Set());
  const isFirstFetchRef = useRef(true);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTurfs = async () => {
    try {
      const res = await fetch(`${API}/api/turfs?ownerId=${userId}`, { headers });
      if (res.ok) setMyTurfs(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API}/api/bookings?ownerId=${userId}`, { headers });
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
  // UC-02: Add Venue
  const submitVenue = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (venueForm.imageFiles && venueForm.imageFiles.length > 0) {
        const formData = new FormData();
        formData.append('ownerId', userId);
        formData.append('name', venueForm.name);
        formData.append('sportType', venueForm.sportType);
        formData.append('pricePerHour', venueForm.pricePerHour);
        formData.append('location', venueForm.location);
        formData.append('description', venueForm.description);
        
        // Append all selected files
        for (let i = 0; i < venueForm.imageFiles.length; i++) {
          formData.append('images', venueForm.imageFiles[i]);
        }
        
        res = await fetch(`${API}/api/turfs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type, browser sets it with boundaries
          body: formData
        });
      } else {
        res = await fetch(`${API}/api/turfs`, {
          method: 'POST', headers,
          body: JSON.stringify({ ...venueForm, ownerId: parseInt(userId) })
        });
      }
      
      if (res.ok) {
        setVenueForm({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '', imageFiles: [] });
        setShowVenueForm(false);
        fetchTurfs();
        setToasts(p => [...p, { id: Date.now(), msg: `Venue listed successfully!` }]);
      } else {
        const errorData = await res.json();
        alert(`Error listing venue: ${errorData.error}`);
      }
    } catch (err) { 
      console.error(err);
      alert('Network error while listing venue.');
    }
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

  const updateMaintenance = async (turfId, start, end) => {
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'PUT', headers,
        body: JSON.stringify({ turfId, action: 'MAINTENANCE', start, end })
      });
      if (res.ok) fetchTurfs();
    } catch (err) { console.error(err); }
  };
  const deleteTurf = async (turfId) => {
    if (!window.confirm("Are you sure you want to delete this venue? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/api/turfs?turfId=${turfId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTurfs();
        setToasts(p => [...p, { id: Date.now(), msg: `Venue deleted successfully.` }]);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) { console.error(err); }
  };
  const startEdit = (turf) => {
    setEditingTurfId(turf.TurfID);
    setEditForm({
      name: turf.Name,
      sportType: turf.SportType || 'Football',
      pricePerHour: turf.PricePerHour || '',
      location: turf.Location || '',
      description: turf.Description || '',
      imageFiles: []
    });
  };

  const saveEdit = async (e) => {
    if (e) e.preventDefault();
    try {
      let res;
      // If there are new images, we use FormData and POST with action=UPDATE
      if (editForm.imageFiles && editForm.imageFiles.length > 0) {
        const formData = new FormData();
        formData.append('action', 'FULL_UPDATE');
        formData.append('turfId', editingTurfId);
        formData.append('name', editForm.name);
        formData.append('sportType', editForm.sportType);
        formData.append('pricePerHour', editForm.pricePerHour);
        formData.append('location', editForm.location);
        formData.append('description', editForm.description);
        
        for (let i = 0; i < editForm.imageFiles.length; i++) {
          formData.append('images', editForm.imageFiles[i]);
        }

        res = await fetch(`${API}/api/turfs`, {
          method: 'POST', // Use POST for multipart updates
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      } else {
        // Textual update via PUT
        res = await fetch(`${API}/api/turfs`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            action: 'FULL_UPDATE',
            turfId: editingTurfId,
            name: editForm.name,
            sportType: editForm.sportType,
            pricePerHour: editForm.pricePerHour,
            location: editForm.location,
            description: editForm.description
          })
        });
      }

      if (res.ok) {
        setEditingTurfId(null);
        fetchTurfs();
        setToasts(p => [...p, { id: Date.now(), msg: `Venue updated successfully!` }]);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) { 
      console.error(err);
      alert('Error updating venue details.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Toast Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="brutal-card p-4 border-accent/50 shadow-lg shadow-accent/10 text-white animate-fade-in-up flex items-center gap-3">
            <span className="text-xl">🛎️</span> {t.msg}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              Control <span className="text-accent">Center</span>
            </h1>
            <p className="text-slate-400 mt-4 max-w-md font-medium">Manage your properties, real-time booking schedules, and dynamic pricing rules from one kinetic dashboard.</p>
          </div>
          <div className="brutal-card p-6 min-w-[240px]">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Monthly Revenue</span>
            <span className="text-4xl font-black text-accent tracking-tighter">Rs. {monthlyRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-12">
          <button onClick={() => setActiveTab('venues')} className={`px-8 py-3 font-black uppercase tracking-tighter text-sm transition-all border-2 ${activeTab === 'venues' ? 'bg-accent text-black border-accent' : 'text-white border-white/10 hover:border-accent hover:text-accent'}`}>🏢 Venue Manager</button>
          <button onClick={() => setActiveTab('calendar')} className={`px-8 py-3 font-black uppercase tracking-tighter text-sm transition-all border-2 ${activeTab === 'calendar' ? 'bg-accent text-black border-accent' : 'text-white border-white/10 hover:border-accent hover:text-accent'}`}>📅 Visual Calendar</button>
          <button onClick={() => setActiveTab('pricing')} className={`px-8 py-3 font-black uppercase tracking-tighter text-sm transition-all border-2 ${activeTab === 'pricing' ? 'bg-accent text-black border-accent' : 'text-white border-white/10 hover:border-accent hover:text-accent'}`}>💲 Pricing Rules</button>
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
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Turf Images (Select Multiple)</label>
                    <input type="file" multiple accept="image/*" onChange={e => setVenueForm({...venueForm, imageFiles: Array.from(e.target.files)})} className="w-full px-4 py-2 bg-arena-950 border border-white/10 rounded-xl text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30" />
                    {venueForm.imageFiles.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {venueForm.imageFiles.map((file, index) => (
                          <div key={index} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <textarea placeholder="Description" value={venueForm.description} onChange={e => setVenueForm({...venueForm, description: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none mb-4" rows="2" />
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-all">List Property</button>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {myTurfs.map(t => (
                <div key={t.TurfID} className="brutal-card group overflow-hidden">
                  {/* Image Header */}
                  <div className="h-48 bg-slate-800 relative">
                    {t.ImageURL ? (
                      <img src={`${API}${t.ImageURL}`} alt={t.Name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-arena-950">
                        <span className="text-4xl mb-2">🏟️</span>
                        <span className="text-indigo-400/50 text-sm font-semibold tracking-widest uppercase">ArenaHub Turf</span>
                      </div>
                    )}
                    <span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md ${t.Status === 'MAINTENANCE' ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                      {t.Status}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{t.Name}</h3>
                        <p className="text-sm text-slate-400">{t.Location || 'No location set'} • {t.SportType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-400">Rs. {t.PricePerHour}<span className="text-sm text-slate-500">/hr</span></p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                      <button onClick={() => startEdit(t)} className="flex-1 py-2 rounded bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30 hover:bg-amber-500/20 transition-all">Edit Info</button>
                      <button onClick={() => deleteTurf(t.TurfID)} className="flex-1 py-2 rounded bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/30 hover:bg-rose-500/20 transition-all">Delete</button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                      {/* Maintenance Lock */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="text-sm font-semibold text-white">Maintenance Lock</p>
                            <p className="text-xs text-slate-400">Prevent bookings during specific dates</p>
                          </div>
                          {t.Status === 'MAINTENANCE' && (
                            <button onClick={() => clearMaintenance(t.TurfID)} className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-tighter">Clear Lock</button>
                          )}
                        </div>
                        {t.Status === 'MAINTENANCE' ? (
                          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-bold">
                            Locked: {t.MaintenanceLockStart} to {t.MaintenanceLockEnd}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="date" className="flex-1 px-2 py-1.5 bg-arena-950 border border-white/10 rounded text-slate-300 text-[10px]" 
                              onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, start: e.target.value})} />
                            <input type="date" className="flex-1 px-2 py-1.5 bg-arena-950 border border-white/10 rounded text-slate-300 text-[10px]" 
                              onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, end: e.target.value})} />
                            <button onClick={() => submitMaintenance(t.TurfID)} disabled={!maintenanceForm.start || !maintenanceForm.end || maintenanceForm.turfId !== t.TurfID}
                              className="px-3 py-1.5 bg-zinc-800 text-white rounded text-[10px] font-bold uppercase disabled:opacity-50 hover:bg-zinc-700">Lock</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {myTurfs.length === 0 && (
                <div className="col-span-full py-20 brutal-card flex flex-col items-center justify-center">
                  <span className="text-6xl mb-4 opacity-50">🏟️</span>
                  <p className="text-xl font-bold text-slate-500 uppercase tracking-tighter">No venues listed yet</p>
                  <button onClick={() => setShowVenueForm(true)} className="mt-4 brutal-btn px-6 py-2">+ List Your First Property</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: Visual Calendar ═══ */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Booking Schedule</h2>
              <div className="space-y-8">
                {/* Group bookings by Date */}
                {Object.entries(
                  ownerBookings.reduce((acc, b) => {
                    (acc[b.BookingDate] = acc[b.BookingDate] || []).push(b);
                    return acc;
                  }, {})
                ).sort(([d1], [d2]) => new Date(d1) - new Date(d2)).map(([date, bks]) => (
                  <div key={date}>
                    <h3 className="text-lg font-bold text-emerald-400 mb-3 border-b border-white/10 pb-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bks.map(b => {
                        const isCancelled = b.Status === 'CANCELLED';
                        const borderColor = isCancelled ? 'bg-rose-500' : b.Status === 'CONFIRMED' ? 'bg-emerald-500' : 'bg-amber-500';
                        return (
                          <div key={b.BookingID} className={`p-4 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group ${isCancelled ? 'opacity-75' : ''}`}>
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`} />
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-semibold text-white">{b.TurfName}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCancelled ? 'bg-rose-500/20 text-rose-400' : b.Status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {b.Status}
                              </span>
                            </div>
                            <p className={`text-xl font-bold my-1 ${isCancelled ? 'text-rose-400 line-through' : 'text-emerald-400'}`}>{b.StartTime.substring(0,5)} <span className="text-sm text-slate-500 font-normal">to</span> {b.EndTime.substring(0,5)}</p>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                              <span className="uppercase tracking-wide">{b.Visibility} Game</span>
                              {b.PaymentStatus === 'PAID' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">PAID</span>}
                              {b.PaymentStatus === 'REFUNDED' && <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">REFUNDED</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {ownerBookings.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No bookings to display.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ═══ TAB: Pricing Rules ═══ */}
        {activeTab === 'pricing' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Pricing Rules & Surge Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myTurfs.map(t => (
                  <div key={t.TurfID} className="p-5 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{t.Name}</h3>
                        <p className="text-sm text-slate-400">Base Price: <span className="text-emerald-400 font-bold">Rs. {t.PricePerHour}</span></p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.WeekendPriceMultiplier > 1.0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>
                        {t.WeekendPriceMultiplier > 1.0 ? 'SURGE ACTIVE' : 'STANDARD'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-arena-950 border border-white/5">
                      <div>
                        <p className="text-sm font-semibold text-white">Weekend Surge Pricing</p>
                        <p className="text-xs text-slate-400">Automatically multiply price by 1.2x on weekends</p>
                      </div>
                      <button onClick={() => toggleSurgePricing(t.TurfID, t.WeekendPriceMultiplier)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.WeekendPriceMultiplier > 1.0 ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.WeekendPriceMultiplier > 1.0 ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                ))}
                {myTurfs.length === 0 && (
                  <p className="text-slate-500 text-center py-8 col-span-full">No venues found to manage pricing.</p>
                )}
              </div>
            </div>
          </div>
        )}


        {/* ═══ Edit Venue Modal ═══ */}
        {editingTurfId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl p-8 w-full max-w-2xl animate-fade-in-up border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Edit Venue Details</h3>
                <button onClick={() => setEditingTurfId(null)} className="text-slate-400 hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={saveEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Venue Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Sport Type</label>
                    <select value={editForm.sportType} onChange={e => setEditForm({...editForm, sportType: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none">
                      <option value="Football">Football</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Tennis">Tennis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Price per Hour (Rs.)</label>
                    <input type="number" value={editForm.pricePerHour} onChange={e => setEditForm({...editForm, pricePerHour: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Location</label>
                    <input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none" required />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={3} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Add More Photos (Optional)</label>
                  <input type="file" multiple onChange={e => setEditForm({...editForm, imageFiles: Array.from(e.target.files)})}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20" />
                  <p className="text-[10px] text-slate-500 mt-1">* New photos will be added to the gallery. Existing photos are preserved.</p>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setEditingTurfId(null)} 
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Cancel</button>
                  <button type="submit" 
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-indigo-500 transition-all">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OwnerDashboard;