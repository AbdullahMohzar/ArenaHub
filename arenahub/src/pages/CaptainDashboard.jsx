import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TurfDetailModal from '../components/TurfDetailModal';
import { collectTurfImageUrls, VenueImageCarousel } from '../components/VenueImageCarousel';
import BookingPoster, { EmptyBookings } from '../components/BookingPoster';

const API = 'http://localhost:8080';
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const CaptainDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  // ── State ──
  const [turfs, setTurfs] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('book');
  const [bookingFilter, setBookingFilter] = useState('UPCOMING');
  const location = useLocation();
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [toppingUp, setToppingUp] = useState(false);

  // Helper to open the global chat sidebar for direct messages
  const openChatSidebar = (contactUserId, contactName, contactRole, contactId = null) => {
    window.dispatchEvent(new CustomEvent('open-chat-sidebar', {
      detail: { contactId, contactUserId, contactName, contactRole }
    }));
  };

  useEffect(() => {
    if (location.pathname === '/venues') setActiveTab('book');
    else if (location.pathname === '/equipment') setActiveTab('book');
    else if (location.pathname === '/subscriptions') setActiveTab('book');
    else if (location.pathname === '/dashboard') setActiveTab('bookings');
    else if (location.pathname === '/wallet') setActiveTab('wallet');
  }, [location.pathname]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(5000);

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    turfId: null,
    bookingDate: '',
    startTime: '',
    endTime: '',
    visibility: 'PRIVATE',
    maxPlayers: 10,
    isRecurring: false,
    selectedEquipment: [] // Array of { equipmentId, quantity, name, pricePerHour }
  });

  // Turf Detail Modal
  const [selectedTurf, setSelectedTurf] = useState(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Fetchers ──
  const fetchTurfs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (sportFilter !== 'All') params.append('sportType', sportFilter);
      if (maxPrice < 5000) params.append('maxPrice', maxPrice);
      const res = await fetch(`${API}/api/turfs?${params}`);
      if (res.ok) setTurfs(await res.json());
    } catch (err) { console.error(err); }
  }, [search, sportFilter, maxPrice]);

  const fetchBookings = async () => {
    if (!userId || !token) return navigate('/login');
    try {
      const res = await fetch(`${API}/api/bookings?userId=${userId}`, { headers });
      if (res.status === 401) { localStorage.clear(); return navigate('/login'); }
      if (res.ok) setMyBookings(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${API}/api/equipment`, { headers });
      if (res.ok) setEquipmentList(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API}/api/wallet?userId=${userId}`, { headers });
      if (res.ok) setWallet(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => { fetchBookings(); fetchEquipment(); fetchWallet(); }, []);

  // ── Conflict fetch ──
  const fetchConflicts = async (turfId, date) => {
    if (!turfId || !date) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API}/api/bookings?checkConflicts=true&date=${date}&turfId=${turfId}`, { headers });
      if (res.ok) setBusySlots(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingSlots(false); }
  };

  const isSlotOccupied = (hour) => {
    const s = `${String(hour).padStart(2, '0')}:00`, e = `${String(hour + 1).padStart(2, '0')}:00`;
    return busySlots.some(b => s < b.endTime.substring(0, 5) && e > b.startTime.substring(0, 5));
  };

  const isSlotSelected = (hour) => {
    if (!bookingForm.startTime || !bookingForm.endTime) return false;
    const s = `${String(hour).padStart(2, '0')}:00`, e = `${String(hour + 1).padStart(2, '0')}:00`;
    return s >= bookingForm.startTime && e <= bookingForm.endTime;
  };

  const handleSlotClick = (hour) => {
    if (isSlotOccupied(hour)) return;
    const cs = `${String(hour).padStart(2, '0')}:00`, ce = `${String(hour + 1).padStart(2, '0')}:00`;
    if (!bookingForm.startTime || bookingForm.endTime) {
      setBookingForm(p => ({ ...p, startTime: cs, endTime: ce }));
    } else {
      if (cs < bookingForm.startTime) setBookingForm(p => ({ ...p, startTime: cs }));
      else setBookingForm(p => ({ ...p, endTime: ce }));
    }
  };

  const handleDateChange = (e, turfId) => {
    setBookingForm(p => ({ ...p, bookingDate: e.target.value, startTime: '', endTime: '' }));
    setBusySlots([]);
    fetchConflicts(turfId, e.target.value);
  };

  // ── Equipment Selection ──
  const toggleEquipment = (eq) => {
    setBookingForm(prev => {
      const existing = prev.selectedEquipment.find(e => e.equipmentId === eq.equipmentId);
      if (existing) {
        return { ...prev, selectedEquipment: prev.selectedEquipment.filter(e => e.equipmentId !== eq.equipmentId) };
      } else {
        return { ...prev, selectedEquipment: [...prev.selectedEquipment, { ...eq, quantity: 1, totalPrice: eq.pricePerHour }] };
      }
    });
  };

  const calculateTotal = (turfPrice) => {
    if (!bookingForm.startTime || !bookingForm.endTime) return 0;
    const startHour = parseInt(bookingForm.startTime.split(':')[0]);
    const endHour = parseInt(bookingForm.endTime.split(':')[0]);
    const duration = endHour - startHour;
    
    let total = duration * turfPrice;
    bookingForm.selectedEquipment.forEach(eq => {
      total += eq.pricePerHour * eq.quantity;
    });

    if (bookingForm.isRecurring) total *= 4; // 4 weeks
    return total;
  };

  // ── Booking submission with payment simulation ──
  const submitBooking = async (turfId) => {
    if (!bookingForm.startTime || !bookingForm.endTime) return alert('Select a time slot.');
    setProcessingPayment(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      const payload = {
        userId: parseInt(userId),
        turfId,
        bookingDate: bookingForm.bookingDate,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        visibility: bookingForm.visibility,
        maxPlayers: bookingForm.maxPlayers,
        isRecurring: bookingForm.isRecurring,
        equipment: bookingForm.selectedEquipment
      };

      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST', headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', visibility: 'PRIVATE', maxPlayers: 10, isRecurring: false, selectedEquipment: [] });
        setBusySlots([]);
        fetchBookings();
        alert(data.message);
      } else alert(data.error);
    } catch (err) { console.error(err); }
    finally { setProcessingPayment(false); }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'PUT', headers,
        body: JSON.stringify({ bookingId, action: 'CANCEL' })
      });
      if (res.ok) {
        fetchBookings();
        fetchWallet();
      }
    } catch (err) { console.error(err); }
  };

  const toggleVisibility = async (bookingId) => {
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'PUT', headers,
        body: JSON.stringify({ bookingId, action: 'TOGGLE_VISIBILITY' })
      });
      if (res.ok) fetchBookings();
    } catch (err) { console.error(err); }
  };

  // ── Top up wallet ──
  const topUpWallet = async (amount) => {
    setToppingUp(true);
    try {
      const res = await fetch(`${API}/api/wallet`, {
        method: 'POST', headers,
        body: JSON.stringify({ userId: parseInt(userId), amount })
      });
      const data = await res.json();
      if (res.ok) { fetchWallet(); }
      else alert(data.error);
    } catch (err) { console.error(err); }
    finally { setToppingUp(false); }
  };

  const sportTypes = ['All', ...new Set(turfs.map(t => t.SportType).filter(Boolean))];

  return (
    <div className="min-h-screen bg-arena-950">
      {/* Payment Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white/50 rounded-full animate-spin" />
          <p className="text-white text-lg font-semibold mt-5">Processing Squad Payment...</p>
          <p className="text-slate-400 text-sm mt-1">Please wait while we secure your slot</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="sports-kicker mb-1">Sideline</p>
            <h1 className="font-display text-4xl sm:text-5xl text-white uppercase tracking-wide">Captain&apos;s desk</h1>
            <p className="text-slate-400 mt-2 text-sm max-w-lg">Call the plays — lock slots, go public for pickups, stack gear for the squad.</p>
          </div>
          {/* Wallet Card */}
          <div className="glass rounded-2xl px-6 py-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Wallet Balance</p>
              <p className="text-2xl font-bold text-zinc-200">Rs. {wallet.balance?.toLocaleString('en-IN') || 0}</p>
            </div>
            <button onClick={() => topUpWallet(1000)} disabled={toppingUp}
              className="px-4 py-2 rounded-lg bg-white/10 text-zinc-200 text-sm font-semibold border border-white/25 hover:bg-white/20 disabled:opacity-50 transition-all">
              {toppingUp ? '...' : '+ Rs. 1,000'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 p-1.5 glass rounded-lg mb-6 w-fit ring-1 ring-white/5">
          <button onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'book' ? 'bg-white/10 text-white border-white/50 shadow-[0_0_20px_-8px_rgba(255,255,255,0.12)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
            🛡️ Book & Manage
          </button>
          <button onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'bookings' ? 'bg-white/10 text-white border-white/50 shadow-[0_0_20px_-8px_rgba(255,255,255,0.12)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
            📋 Squad Bookings
          </button>
          <button onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === 'wallet' ? 'bg-white/10 text-white border-white/50 shadow-[0_0_20px_-8px_rgba(255,255,255,0.12)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
            💰 My Wallet
          </button>
        </div>

        {/* ═══ TAB: Book & Manage ═══ */}
        {activeTab === 'book' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text" placeholder="Search venues by name..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none">
                  {sportTypes.map(s => <option key={s} value={s} className="bg-arena-900">{s === 'All' ? 'All Sports' : s}</option>)}
                </select>
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Max Rs.{maxPrice}</span>
                  <input type="range" min="200" max="5000" step="100" value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="flex-1 accent-white h-1.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {turfs.map((turf) => {
                const turfUrls = collectTurfImageUrls(turf, API);
                return (
                <div key={turf.TurfID} className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${bookingForm.turfId === turf.TurfID ? 'border-white/40 shadow-lg shadow-white/10' : 'hover:border-white/20'}`}>
                  <div className="h-48 bg-slate-800 relative isolate">
                    <VenueImageCarousel urls={turfUrls} alt={turf.Name} emptyVariant="captain" />
                    {turfUrls.length > 1 && (
                      <span className="absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/55 text-white border border-white/10 backdrop-blur-sm">
                        {turfUrls.length} photos
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex gap-3 min-w-0">
                        {turfUrls[0] ? (
                          <div className="h-14 w-14 rounded-xl overflow-hidden border-2 border-white/35 shrink-0 shadow-md ring-1 ring-white/10 bg-slate-900">
                            <img src={turfUrls[0]} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-white truncate">{turf.Name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-300 mt-1">{turf.SportType}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-zinc-200">Rs. {turf.PricePerHour}<span className="text-sm text-slate-500">/hr</span></p>
                        <button onClick={(e) => { e.stopPropagation(); openChatSidebar(turf.OwnerID, null, 'Owner'); }} className="mt-1 flex items-center justify-end w-full gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-semibold border border-white/25 hover:bg-white/20 transition-all">
                          💬 Contact Owner
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedTurf(turf); }} className="mt-1 flex items-center justify-end w-full gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-semibold border border-white/25 hover:bg-white/20 transition-all">
                          🖼️ View Details
                        </button>
                      </div>
                    </div>

                    {bookingForm.turfId === turf.TurfID ? (
                      <div className="space-y-5 animate-fade-in-up">
                        {/* 1. Date & Time */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-white mb-3">1. Select Schedule</h4>
                          <input type="date" value={bookingForm.bookingDate} min={new Date().toISOString().split('T')[0]}
                            onChange={e => handleDateChange(e, turf.TurfID)}
                            className="w-full px-3 py-2 bg-arena-950 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 mb-4" />

                          {bookingForm.bookingDate && (
                            <div>
                              <div className="grid grid-cols-6 gap-1.5">
                                {HOURS.map(h => {
                                  const occ = isSlotOccupied(h), sel = isSlotSelected(h);
                                  return (
                                    <button key={h} onClick={() => handleSlotClick(h)}
                                      className={`py-2 rounded text-xs font-semibold transition-all ${occ ? 'bg-white/10 text-zinc-400 cursor-not-allowed opacity-60' : sel ? 'bg-white text-black shadow-md shadow-white/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                                      {String(h).padStart(2, '0')}
                                    </button>
                                  );
                                })}
                              </div>
                              {bookingForm.startTime && <p className="text-sm text-zinc-200 font-semibold mt-3 text-center">Selected: {bookingForm.startTime} — {bookingForm.endTime}</p>}
                            </div>
                          )}
                        </div>

                        {/* 2. Game Settings (UC-05, UC-08) */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                          <h4 className="text-sm font-semibold text-white">2. Game Settings</h4>
                          
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={bookingForm.visibility === 'PUBLIC'}
                                onChange={(e) => setBookingForm({ ...bookingForm, visibility: e.target.checked ? 'PUBLIC' : 'PRIVATE' })} />
                              <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-white peer-checked:border-white transition-colors"></div>
                              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Make Game Public</p>
                              <p className="text-xs text-slate-400">Allow solo players to join and fill your squad</p>
                            </div>
                          </label>

                          {bookingForm.visibility === 'PUBLIC' && (
                            <div className="pl-8 flex items-center gap-3">
                              <span className="text-xs text-slate-400">Max Players:</span>
                              <input type="number" min="2" max="22" value={bookingForm.maxPlayers} onChange={(e) => setBookingForm({...bookingForm, maxPlayers: parseInt(e.target.value)})}
                                className="w-20 px-2 py-1 bg-arena-950 border border-white/10 rounded text-white text-sm" />
                            </div>
                          )}

                          <label className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-white/5">
                            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={bookingForm.isRecurring}
                                onChange={(e) => setBookingForm({ ...bookingForm, isRecurring: e.target.checked })} />
                              <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-white peer-checked:border-white transition-colors"></div>
                              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Subscribe Weekly (Recurring)</p>
                              <p className="text-xs text-slate-400">Book this slot for the next 4 consecutive weeks</p>
                            </div>
                          </label>
                        </div>

                        {/* 3. Equipment Add-ons (UC-09) */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-white mb-3">3. Equipment Add-ons</h4>
                          {equipmentList.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {equipmentList.map(eq => {
                                const isSelected = bookingForm.selectedEquipment.some(e => e.equipmentId === eq.equipmentId);
                                return (
                                  <button key={eq.equipmentId} onClick={() => toggleEquipment(eq)}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected ? 'bg-white/10 border-white/40' : 'bg-arena-950 border-white/10 hover:border-white/20'}`}>
                                    <div>
                                      <p className={`text-sm font-medium ${isSelected ? 'text-zinc-200' : 'text-slate-300'}`}>{eq.name}</p>
                                      <p className="text-xs text-slate-500">+Rs. {eq.pricePerHour}</p>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white' : 'border-slate-500'}`}>
                                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No equipment add-ons are available right now.</p>
                          )}
                        </div>

                        {/* Checkout */}
                        <div className="pt-2 flex gap-3">
                          <button onClick={() => submitBooking(turf.TurfID)} disabled={!bookingForm.startTime}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-white to-zinc-200 text-black font-bold disabled:opacity-40 shadow-lg shadow-white/15 hover:from-zinc-200 hover:to-zinc-300 transition-all flex items-center justify-between px-6">
                            <span>Checkout</span>
                            <span>Rs. {calculateTotal(turf.PricePerHour).toLocaleString('en-IN')}</span>
                          </button>
                          <button onClick={() => setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', visibility: 'PRIVATE', maxPlayers: 10, isRecurring: false, selectedEquipment: [] })}
                            className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 font-medium transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setBookingForm({ ...bookingForm, turfId: turf.TurfID }); }}
                        className="w-full mt-2 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 border border-white/10 transition-all">
                        Select Venue
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>

            {/* Turf Detail Modal */}
            {selectedTurf && (
              <TurfDetailModal 
                turf={selectedTurf} 
                userId={userId} 
                token={token} 
                onClose={() => setSelectedTurf(null)} 
                onBookNow={(t) => setBookingForm({ ...bookingForm, turfId: t.TurfID })} 
              />
            )}
          </div>
        )}

        {/* ═══ TAB: Squad Bookings ═══ */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in-up space-y-4">
            {/* Kinetic Filter Bar */}
            <div className="flex gap-2 mb-6">
              {['UPCOMING', 'COMPLETED', 'CANCELLED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-6 py-2 font-black font-space uppercase text-sm border-2 transition-colors ${
                    bookingFilter === filter
                      ? 'bg-white border-white text-black'
                      : 'border-white/20 text-white hover:border-white/50 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {myBookings
              .filter(b => {
                if (bookingFilter === 'CANCELLED') return b.Status === 'CANCELLED';
                const isPast = new Date(`${b.BookingDate}T${b.StartTime}`) < new Date();
                if (bookingFilter === 'COMPLETED') return isPast && b.Status !== 'CANCELLED';
                return !isPast && b.Status !== 'CANCELLED';
              })
              .map(b => (
              <BookingPoster 
                key={b.BookingID} 
                booking={b} 
                onCancel={cancelBooking} 
                onChat={() => openChatSidebar(null, b.TurfName + ' Squad', 'SQUAD', 'B_' + b.BookingID)} 
                onToggleVisibility={toggleVisibility}
                roleColor="amber" 
              />
            ))}
            {myBookings.filter(b => {
                if (bookingFilter === 'CANCELLED') return b.Status === 'CANCELLED';
                const isPast = new Date(`${b.BookingDate}T${b.StartTime}`) < new Date();
                if (bookingFilter === 'COMPLETED') return isPast && b.Status !== 'CANCELLED';
                return !isPast && b.Status !== 'CANCELLED';
            }).length === 0 && <EmptyBookings />}
          </div>
        )}

        {/* ═══ TAB: My Wallet ═══ */}
        {activeTab === 'wallet' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl overflow-hidden border border-white/15">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white">Transaction History</h2>
                  <p className="text-sm text-slate-400">All your top-ups and payments</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {(wallet.transactions || []).map(t => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{t.date?.substring(0, 10)}</td>
                        <td className="px-6 py-4">{t.description}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                            t.type === 'TOP_UP' ? 'bg-white/10 text-zinc-200' :
                            t.type === 'REFUND' ? 'bg-white/10 text-zinc-300' :
                            'bg-white/10 text-zinc-400'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${['TOP_UP', 'REFUND'].includes(t.type) ? 'text-zinc-200' : 'text-white'}`}>
                          {['TOP_UP', 'REFUND'].includes(t.type) ? '+' : '-'} Rs. {t.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!wallet.transactions || wallet.transactions.length === 0) && (
                  <p className="text-slate-500 text-center py-12">No transactions found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainDashboard;