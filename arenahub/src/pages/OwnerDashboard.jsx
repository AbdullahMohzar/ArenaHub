import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collectTurfImageUrls, VenueImageCarousel } from '../components/VenueImageCarousel';

const API = 'http://localhost:8080';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

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
  const [ownerWallet, setOwnerWallet] = useState({ balance: 0, transactions: [] });

  // New Venue Form
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '', imageFiles: [] });
  
  // Edit Venue
  const [editingTurfId, setEditingTurfId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', sportType: 'Football', pricePerHour: '', location: '', description: '', imageFiles: [] });
  const [removingPhotoPath, setRemovingPhotoPath] = useState(null);

  const toStoredImagePath = (url) => {
    if (!url) return '';
    const s = String(url).trim();
    if (s.startsWith(API)) return s.slice(API.length);
    const idx = s.indexOf('/uploads/');
    if (idx >= 0) return s.slice(idx);
    return s.startsWith('/') ? s : `/${s}`;
  };

  const removeGalleryImage = async (displaySrc) => {
    const imageUrl = toStoredImagePath(displaySrc);
    if (!imageUrl || !editingTurfId) return;
    if (!window.confirm('Remove this photo from the venue gallery?')) return;
    setRemovingPhotoPath(imageUrl);
    try {
      const res = await fetch(`${API}/api/turfs`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ turfId: editingTurfId, action: 'REMOVE_TURF_IMAGE', imageUrl }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) { /* ignore */ }
      if (res.ok) {
        await fetchTurfs();
        setToasts((p) => [...p, { id: Date.now(), msg: 'Photo removed from gallery.' }]);
      } else {
        alert(data.error || 'Could not remove photo.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while removing photo.');
    } finally {
      setRemovingPhotoPath(null);
    }
  };

  const editingTurf = editingTurfId != null ? myTurfs.find((x) => x.TurfID === editingTurfId) : null;
  const existingEditPhotoUrls = useMemo(() => collectTurfImageUrls(editingTurf, API), [editingTurf]);

  const newPhotoPreviewUrls = useMemo(
    () => editForm.imageFiles.map((f) => URL.createObjectURL(f)),
    [editForm.imageFiles]
  );

  useEffect(() => {
    return () => {
      newPhotoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newPhotoPreviewUrls]);

  const closeEditModal = () => {
    setRemovingPhotoPath(null);
    setEditingTurfId(null);
    setEditForm({
      name: '',
      sportType: 'Football',
      pricePerHour: '',
      location: '',
      description: '',
      imageFiles: [],
    });
  };

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
        fetchWallet();
      }
    } catch (err) { console.error(err); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API}/api/wallet?userId=${userId}`, { headers });
      if (res.ok) {
        setOwnerWallet(await res.json());
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
    fetchWallet();
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
        closeEditModal();
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
        <div className="relative mb-12 p-8 lg:p-10 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl group">
          {/* Decorative glowing background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                 <p className="text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase">Facility Ops</p>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-white font-extrabold uppercase leading-[0.95] tracking-wide drop-shadow-md">
                Stadium <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">Control</span>
              </h1>
              <p className="text-slate-400 mt-5 max-w-lg text-sm sm:text-base leading-relaxed font-medium">
                Your venues, your lights. Manage bookings, schedule locks, and trigger surge pricing right from the owner&apos;s box.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center">
              <div className="glass p-6 md:p-8 min-w-[280px] rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group/card hover:border-emerald-500/40 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                        <i className="fi fi-rr-wallet text-emerald-400/80 text-sm"></i>
                        <span>This Month's Gate</span>
                    </div>
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm flex items-baseline gap-1 group-hover/card:scale-105 transition-transform duration-300">
                       <span className="text-2xl text-emerald-400/80 font-bold mr-1">Rs.</span> 
                       {monthlyRevenue.toLocaleString('en-IN')}
                    </span>
                    <div className="w-full mt-5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-white/80 w-1/3 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    </div>
                    <span className="block mt-3 text-[10px] text-slate-500 font-semibold tracking-wider">REVENUE TRACKER ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Owner Wallet</p>
              <p className="text-white text-xl font-black mt-1">Rs. {ownerWallet.balance?.toLocaleString('en-IN') || 0}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-12 p-2 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button onClick={() => setActiveTab('venues')} className={`relative px-7 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3 ${activeTab === 'venues' ? 'text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
            <span className="text-lg">🏟️</span>
             Venue Deck
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`relative px-7 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3 ${activeTab === 'calendar' ? 'text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
            <span className="text-lg">📅</span>
             Schedule Board
          </button>
          <button onClick={() => setActiveTab('pricing')} className={`relative px-7 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3 ${activeTab === 'pricing' ? 'text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
            <span className="text-lg">💲</span>
             Ticket Pricing
          </button>
        </div>



        {/* ═══ TAB: Venue Manager ═══ */}
        {activeTab === 'venues' && (
          <div className="animate-fade-in-up space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">My Properties</h2>
              <button onClick={() => setShowVenueForm(!showVenueForm)} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all">
                {showVenueForm ? 'Close Form' : '+ Add New Venue'}
              </button>
            </div>

            {showVenueForm && (
              <form onSubmit={submitVenue} className="glass rounded-2xl p-6 border border-white/25 animate-fade-in-up">
                <h3 className="text-lg font-bold text-white mb-4">List a New Turf</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input required placeholder="Venue Name" value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-white/50 outline-none" />
                  <select value={venueForm.sportType} onChange={e => setVenueForm({...venueForm, sportType: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-white/50 outline-none">
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Tennis">Tennis</option>
                  </select>
                  <input required type="number" placeholder="Price per Hour (Rs.)" value={venueForm.pricePerHour} onChange={e => setVenueForm({...venueForm, pricePerHour: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-white/50 outline-none" />
                  <input placeholder="Location / Address" value={venueForm.location} onChange={e => setVenueForm({...venueForm, location: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-white/50 outline-none" />
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Turf Images (Select Multiple)</label>
                    <input type="file" multiple accept="image/*" onChange={e => setVenueForm({...venueForm, imageFiles: Array.from(e.target.files)})} className="w-full px-4 py-2 bg-arena-950 border border-white/10 rounded-xl text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-zinc-200 hover:file:bg-white/20" />
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
                <textarea placeholder="Description" value={venueForm.description} onChange={e => setVenueForm({...venueForm, description: e.target.value})} className="w-full px-4 py-2.5 bg-arena-950 border border-white/10 rounded-xl text-white text-sm focus:border-white/50 outline-none mb-4" rows="2" />
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-all">List Property</button>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {myTurfs.map((t) => {
                const turfUrls = collectTurfImageUrls(t, API);
                return (
                <div key={t.TurfID} className="glass group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-1 transition-all duration-300" style={{ contentVisibility: 'auto', containIntrinsicSize: '420px 760px' }}>
                  {/* Image header: auto-slide when multiple photos */}
                  <div className="h-56 relative isolate overflow-hidden rounded-t-3xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />
                    <VenueImageCarousel urls={turfUrls} alt={t.Name} emptyVariant="owner" autoplay={false} />
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                       <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border ${t.Status === 'MAINTENANCE' ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'}`}>
                         {t.Status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE'}
                       </span>
                    </div>
                    {turfUrls.length > 1 && (
                      <span className="absolute bottom-4 right-4 z-20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-md shadow-lg">
                        <i className="fi fi-rr-picture mr-1"></i> {turfUrls.length} Photos
                      </span>
                    )}
                  </div>

                  <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start gap-4 mb-5">
                      <div className="flex gap-4 min-w-0 flex-1">
                        {turfUrls[0] ? (
                          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg bg-slate-900/50 group-hover:scale-105 transition-transform duration-300">
                            <img src={turfUrls[0]} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg bg-slate-900/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                             <span className="text-2xl">🏟️</span>
                          </div>
                        )}
                        <div className="min-w-0 flex flex-col justify-center">
                          <h3 className="text-2xl font-extrabold text-white truncate drop-shadow-sm group-hover:text-emerald-400 transition-colors">{t.Name}</h3>
                          <div className="flex items-center text-sm text-slate-300/80 mt-1 gap-2">
                              <span className="flex items-center gap-1"><i className="fi fi-rr-marker text-emerald-400/80 text-xs"></i><span className="truncate max-w-[120px] sm:max-w-[180px]">{t.Location || 'No location set'}</span></span>
                              <span className="text-white/20">•</span>
                              <span className="flex items-center gap-1"><i className="fi fi-rr-basketball text-emerald-400/80 text-xs"></i> <span>{t.SportType}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md inline-block">
                             <p className="text-xl font-black text-white flex items-baseline gap-1">
                                 <span className="text-sm font-medium text-slate-400">Rs.</span>
                                 {t.PricePerHour}
                                 <span className="text-xs font-medium text-slate-400">/hr</span>
                             </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <button onClick={() => startEdit(t)} className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold shadow-lg shadow-white/10 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2">
                          <i className="fi fi-rr-edit"></i> Edit Details
                      </button>
                      <button onClick={() => deleteTurf(t.TurfID)} className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 hover:text-red-300 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2">
                          <i className="fi fi-rr-trash"></i> Delete
                      </button>
                    </div>

                    <div className="pt-5 border-t border-white/10">
                      {/* Maintenance Lock */}
                      <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <i className="fi fi-rr-settings text-slate-400"></i>
                            <div>
                                <p className="text-sm font-bold text-slate-200">Maintenance Schedule</p>
                                <p className="text-xs text-slate-500">Block dates for upkeep</p>
                            </div>
                          </div>
                          {t.Status === 'MAINTENANCE' && (
                            <button onClick={() => clearMaintenance(t.TurfID)} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-400/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                                <i className="fi fi-rr-unlock"></i> Unlock
                            </button>
                          )}
                        </div>
                        {t.Status === 'MAINTENANCE' ? (
                          <div className="flex items-center gap-3 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-red-200 text-sm font-medium">
                            <i className="fi fi-rr-calendar-clock text-red-400/70"></i>
                            <span>Offline: <strong className="text-red-100">{t.MaintenanceLockStart}</strong> to <strong className="text-red-100">{t.MaintenanceLockEnd}</strong></span>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex-1 flex gap-2 w-full">
                                <div className="relative flex-1 group/input">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none group-focus-within/input:text-emerald-400 text-slate-500 transition-colors">
                                        <i className="fi fi-rr-calendar text-[10px]"></i>
                                    </div>
                                    <input type="date" className="w-full pl-7 pr-2 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" 
                                      onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, start: e.target.value})} />
                                </div>
                                <div className="text-slate-500 flex items-center text-xs px-1">to</div>
                                <div className="relative flex-1 group/input">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none group-focus-within/input:text-emerald-400 text-slate-500 transition-colors">
                                        <i className="fi fi-rr-calendar text-[10px]"></i>
                                    </div>
                                    <input type="date" className="w-full pl-7 pr-2 py-2 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" 
                                      onChange={e => setMaintenanceForm({...maintenanceForm, turfId: t.TurfID, end: e.target.value})} />
                                </div>
                              </div>
                            <button onClick={() => submitMaintenance(t.TurfID)} disabled={!maintenanceForm.start || !maintenanceForm.end || maintenanceForm.turfId !== t.TurfID}
                              className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 shrink-0">
                                  <i className="fi fi-rr-lock"></i> Lock
                              </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
              {myTurfs.length === 0 && (
                <div className="col-span-full py-24 glass rounded-3xl flex flex-col items-center justify-center border border-white/10 border-dashed backdrop-blur-md bg-white/5">
                  <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
                      <span className="text-5xl opacity-40 mix-blend-overlay">🏟️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No venues listed yet</h3>
                  <p className="text-sm text-slate-400 mb-8 max-w-sm text-center">Add your first property to start receiving bookings and managing your turf efficiently.</p>
                  <button onClick={() => setShowVenueForm(true)} className="px-8 py-3.5 rounded-full bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                    <i className="fi fi-rr-add"></i> List Your First Property
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: Visual Calendar ═══ */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                      <i className="fi fi-rr-calendar text-emerald-400"></i> Booking Schedule
                  </h2>
                  <p className="text-slate-400 max-w-2xl text-sm">Review your daily schedule, upcoming reservations, and track game statuses across all your properties in real-time.</p>
              </div>

              <div className="space-y-10">
                {/* Group bookings by Date */}
                {Object.entries(
                  ownerBookings.reduce((acc, b) => {
                    (acc[b.BookingDate] = acc[b.BookingDate] || []).push(b);
                    return acc;
                  }, {})
                ).sort(([d1], [d2]) => new Date(d1) - new Date(d2)).map(([date, bks], index) => (
                  <div key={date} className="relative">
                    {/* Visual Timeline line */}
                    {index !== 0 && <div className="absolute -top-10 left-4 w-px h-10 bg-white/10" />}

                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                            <i className="fi fi-rr-calendar-day text-sm"></i>
                        </div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-4 sm:pl-12">
                      {bks.map(b => {
                        const isCancelled = b.Status === 'CANCELLED';
                        const isConfirmed = b.Status === 'CONFIRMED';
                        const statusColor = isCancelled ? 'red' : isConfirmed ? 'emerald' : 'amber';
                        
                        return (
                          <div key={b.BookingID} className={`group relative p-5 bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-xl ${isCancelled ? 'opacity-60 grayscale hover:opacity-80' : ''}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '240px 220px' }}>
                            {/* Decorative Line matching status */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors group-hover:w-2 ${isCancelled ? 'bg-red-500/50' : isConfirmed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate pr-2">{b.TurfName}</p>
                              <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${isCancelled ? 'bg-red-500/10 text-red-500 border border-red-500/20' : isConfirmed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                {isConfirmed && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                {b.Status}
                              </span>
                            </div>

                            <div className="bg-black/30 rounded-xl p-3 mb-4 border border-white/5">
                                <div className="flex items-center justify-center gap-3">
                                    <p className={`text-2xl font-black tracking-tight ${isCancelled ? 'text-slate-500 line-through' : 'text-white'}`}>
                                        {b.StartTime.substring(0,5)}
                                    </p>
                                    <i className="fi fi-rr-arrow-right text-slate-500 text-xs"></i>
                                    <p className={`text-2xl font-black tracking-tight ${isCancelled ? 'text-slate-500 line-through' : 'text-white'}`}>
                                        {b.EndTime.substring(0,5)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                  <i className={`fi ${b.Visibility === 'Public' ? 'fi-rr-globe' : 'fi-rr-lock'}`}></i>
                                  <span className="uppercase tracking-wider">{b.Visibility}</span>
                              </div>
                              
                              <div className="flex gap-2">
                                  {b.PaymentStatus === 'PAID' && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md shadow-inner">
                                          <i className="fi fi-rr-check-circle"></i> PAID
                                      </span>
                                  )}
                                  {b.PaymentStatus === 'REFUNDED' && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/10 border border-white/10 px-2 py-1 rounded-md">
                                          <i className="fi fi-rr-rotate-right"></i> REFUNDED
                                      </span>
                                  )}
                                  {b.PaymentStatus !== 'PAID' && b.PaymentStatus !== 'REFUNDED' && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
                                          <i className="fi fi-rr-time-clock"></i> PENDING
                                      </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {ownerBookings.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center rounded-3xl border border-white/5 border-dashed bg-white/[0.02]">
                      <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10">
                          <i className="fi fi-rr-calendar-lines text-3xl opacity-30"></i>
                      </div>
                      <p className="text-lg font-bold text-slate-400 mb-2">Your schedule is currently clear.</p>
                      <p className="text-sm text-slate-500">When players book your turfs, they will seamlessly appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ═══ TAB: Pricing Rules ═══ */}
        {activeTab === 'pricing' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                      <i className="fi fi-rr-tags text-accent"></i> Pricing Strategies
                  </h2>
                  <p className="text-slate-400 max-w-2xl text-sm">Manage base prices, enable intelligent surge models, and run dynamic weekends to maximize your turf's revenue seamlessly.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myTurfs.map(t => (
                  <div key={t.TurfID} className="group relative p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl hover:border-accent/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '320px 220px' }}>
                    {/* Decorative Background Blob */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-accent/80 bg-accent/10 px-2.5 py-1 rounded-lg w-fit border border-accent/20">
                            {t.SportType}
                        </span>
                        <h3 className="text-2xl font-bold text-white group-hover:text-accent transition-colors drop-shadow-sm truncate pr-4">{t.Name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="bg-black/40 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-inner flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Base Rate</span>
                            <p className="text-xl font-black text-white flex items-baseline gap-1">
                                <span className="text-sm font-medium text-slate-400">Rs.</span>
                                {t.PricePerHour}
                                <span className="text-xs font-medium text-slate-400">/hr</span>
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="relative z-10 p-5 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-sm group-hover:bg-black/40 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 shadow-inner ${t.WeekendPriceMultiplier > 1.0 ? 'bg-accent/20 text-accent ring-1 ring-accent/30' : 'bg-white/5 text-slate-400 ring-1 ring-white/10'}`}>
                                  <i className="fi fi-rr-arrow-trend-up text-xl"></i>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold text-white">Weekend Surge</p>
                                    {t.WeekendPriceMultiplier > 1.0 ? (
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 flex items-center gap-1 animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                            Idle
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">Automatically multiply rates by <strong className="text-slate-200">1.2x</strong> on Sat & Sun to boost profits.</p>
                              </div>
                          </div>
                          
                          <button onClick={() => toggleSurgePricing(t.TurfID, t.WeekendPriceMultiplier)}
                            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 shadow-inner focus:outline-none ${t.WeekendPriceMultiplier > 1.0 ? 'bg-accent shadow-[0_0_15px_var(--role-color)]' : 'bg-slate-700'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${t.WeekendPriceMultiplier > 1.0 ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
                {myTurfs.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center rounded-3xl border border-white/5 border-dashed bg-white/[0.02]">
                      <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10">
                          <i className="fi fi-rr-tags text-3xl opacity-30"></i>
                      </div>
                      <p className="text-lg font-bold text-slate-400 mb-2">No properties available for pricing.</p>
                      <p className="text-sm text-slate-500">List a venue first to start managing its pricing strategies.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* ═══ Edit Venue Modal ═══ */}
        {editingTurfId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl p-8 w-full max-w-2xl animate-fade-in-up border border-white/10 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Edit Venue Details</h3>
                <button type="button" onClick={closeEditModal} className="text-slate-400 hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={saveEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Venue Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-white/50 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Sport Type</label>
                    <select value={editForm.sportType} onChange={e => setEditForm({...editForm, sportType: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-white/50 outline-none">
                      <option value="Football">Football</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Tennis">Tennis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Price per Hour (Rs.)</label>
                    <input type="number" value={editForm.pricePerHour} onChange={e => setEditForm({...editForm, pricePerHour: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-white/50 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Location</label>
                    <input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-white/50 outline-none" required />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={3} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-white/50 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Venue photos</label>
                  {existingEditPhotoUrls.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Current gallery</p>
                      <div className="flex gap-2 flex-wrap">
                        {existingEditPhotoUrls.map((src, i) => {
                          const pathKey = toStoredImagePath(src);
                          const busy = removingPhotoPath === pathKey;
                          return (
                            <div
                              key={`ex-${i}-${pathKey}`}
                              className={`relative h-20 w-20 rounded-lg overflow-hidden border border-white/15 ring-1 ring-white/10 shadow-md bg-slate-900 shrink-0 ${busy ? 'opacity-60' : ''}`}
                            >
                              <img src={src} alt="" className="h-full w-full object-cover" />
                              {i === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 bg-black/75 text-[9px] text-center text-white py-0.5 font-bold uppercase tracking-tighter">
                                  Cover
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(src)}
                                disabled={removingPhotoPath != null}
                                title="Remove from gallery"
                                className="absolute top-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-white text-sm font-bold leading-none shadow-lg opacity-90 hover:bg-zinc-600 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              >
                                {busy ? '…' : '×'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setEditForm({ ...editForm, imageFiles: Array.from(e.target.files || []) })}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-zinc-200 hover:file:bg-white/20"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">New uploads are appended to the gallery. Thumbnails update after you save.</p>
                  {newPhotoPreviewUrls.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-white/10 border border-white/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-2">Adding to gallery</p>
                      <div className="flex gap-2 flex-wrap">
                        {newPhotoPreviewUrls.map((src, i) => (
                          <div
                            key={`new-${i}-${src}`}
                            className="relative h-20 w-20 rounded-lg overflow-hidden border-2 border-white/40 ring-2 ring-white/10 shadow-lg shadow-black/40 shrink-0"
                          >
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm({
                                  ...editForm,
                                  imageFiles: editForm.imageFiles.filter((_, j) => j !== i),
                                })
                              }
                              title="Remove from upload queue"
                              className="absolute top-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/90 text-white text-sm font-bold leading-none border border-white/20 hover:bg-zinc-700 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={closeEditModal}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Cancel</button>
                  <button type="submit" 
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-white to-zinc-200 text-black font-bold shadow-lg shadow-white/15 hover:from-zinc-200 hover:to-zinc-300 transition-all">
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