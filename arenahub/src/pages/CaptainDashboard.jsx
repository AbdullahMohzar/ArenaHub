import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
        fetchWallet();
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
  const visibleBookings = useMemo(() => {
    return myBookings.filter(b => {
      if (bookingFilter === 'CANCELLED') return b.Status === 'CANCELLED';
      const isPast = new Date(`${b.BookingDate}T${b.StartTime}`) < new Date();
      if (bookingFilter === 'COMPLETED') return isPast && b.Status !== 'CANCELLED';
      return !isPast && b.Status !== 'CANCELLED';
    });
  }, [myBookings, bookingFilter]);

  return (
    <div className="min-h-screen bg-arena-950">
      {/* Payment Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-14 h-14 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-emerald-400 text-lg font-bold mt-5">Processing Squad Payment...</p>
          <p className="text-slate-400 text-sm mt-1">Please wait while we secure your slot</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative mb-12 p-8 lg:p-10 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl group">
          {/* Decorative glowing background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                 <p className="text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase">Captain's Quarters</p>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-white font-extrabold uppercase leading-[0.95] tracking-wide drop-shadow-md">
                Squad <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Command</span>
              </h1>
              <p className="text-slate-400 mt-5 max-w-lg text-sm sm:text-base leading-relaxed font-medium">
                Assemble your team, lock in prime turf times, and manage your squad's undisputed legacy all in one place.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center">
              <div className="glass p-6 md:p-8 min-w-[280px] rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group/card hover:border-emerald-500/40 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400/80 uppercase tracking-[0.2em]">
                            <i className="fi fi-rr-wallet text-sm"></i>
                            <span>Team Funds</span>
                        </div>
                        <button onClick={() => topUpWallet(1000)} disabled={toppingUp} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-white transition-colors flex items-center gap-1 disabled:opacity-50 border border-white/5">
                            <i className="fi fi-rr-plus-small"></i> Add Rs.1k
                        </button>
                    </div>
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm flex items-baseline gap-1 group-hover/card:scale-105 transition-transform duration-300 mt-2">
                       <span className="text-2xl text-emerald-400/80 font-bold mr-1">Rs.</span> 
                       {wallet.balance?.toLocaleString('en-IN') || 0}
                    </span>
                    <div className="w-full mt-5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-white/80 w-3/4 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    </div>
                    <span className="block mt-3 text-[10px] text-slate-500 font-semibold tracking-wider">AVAILABLE BALANCE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-12 p-2 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {[
            { id: 'book', icon: '🛡️', label: 'Book & Manage' },
            { id: 'bookings', icon: '📋', label: 'Squad Timetable' },
            { id: 'wallet', icon: '💰', label: 'Team Treasury' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-7 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3 ${activeTab === tab.id ? 'text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
              <span className="text-lg">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: Book & Manage ═══ */}
        {activeTab === 'book' && (
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl rounded-3xl p-6 mb-8 border border-white/10 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within/input:text-emerald-400 text-slate-500 transition-colors">
                     <i className="fi fi-rr-search"></i>
                  </div>
                  <input
                    type="text" placeholder="Search elite venues..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="relative group/select min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-400">
                        <i className="fi fi-rr-basketball"></i>
                    </div>
                    <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-inner appearance-none">
                    {sportTypes.map(s => <option key={s} value={s} className="bg-arena-950">{s === 'All' ? 'All Disciplines' : s}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 group-focus-within/select:text-emerald-400">
                        <i className="fi fi-rr-angle-small-down"></i>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 shadow-inner">
                  <span className="text-xs font-black text-emerald-400/80 uppercase tracking-widest whitespace-nowrap">Max Rs.{maxPrice}</span>
                  <input type="range" min="200" max="5000" step="100" value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 h-1.5 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {turfs.map((turf) => {
                const turfUrls = collectTurfImageUrls(turf, API);
                return (
                <div key={turf.TurfID} className={`glass group overflow-hidden rounded-3xl border transition-all duration-300 bg-white/5 backdrop-blur-md shadow-xl ${bookingForm.turfId === turf.TurfID ? 'border-emerald-400/50 shadow-emerald-500/20 ring-1 ring-emerald-400/30 transform scale-[1.01]' : 'border-white/10 hover:shadow-2xl hover:shadow-white/5 hover:border-white/20'}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '420px 760px' }}>
                  <div className="h-56 relative isolate overflow-hidden rounded-t-3xl">
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none" />
                    <VenueImageCarousel urls={turfUrls} alt={turf.Name} emptyVariant="captain" autoplay={false} />
                    {turfUrls.length > 1 && (
                      <span className="absolute top-4 left-4 z-20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-md shadow-lg">
                        <i className="fi fi-rr-picture mr-1"></i> {turfUrls.length} photos
                      </span>
                    )}
                  </div>
                  <div className="p-6 relative z-10 -mt-8">
                    <div className="flex items-end justify-between mb-5 gap-4">
                      <div className="flex gap-4 min-w-0 items-end">
                        {turfUrls[0] ? (
                          <div className="h-20 w-20 rounded-2xl overflow-hidden border-[3px] border-arena-950 shrink-0 shadow-xl bg-slate-900 relative z-20 group-hover:scale-105 transition-transform duration-300">
                            <img src={turfUrls[0]} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0 pb-1">
                          <h3 className="text-2xl font-extrabold text-white truncate drop-shadow-sm group-hover:text-emerald-400 transition-colors">{turf.Name}</h3>
                          <div className="flex items-center text-sm text-slate-300/80 mt-1 gap-2">
                              <span className="flex items-center gap-1"><i className="fi fi-rr-basketball text-emerald-400/80 text-xs"></i> <span>{turf.SportType}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md inline-block mb-2">
                             <p className="text-xl font-black text-white flex items-baseline gap-1">
                                 <span className="text-sm font-medium text-slate-400">Rs.</span>
                                 {turf.PricePerHour}
                                 <span className="text-xs font-medium text-slate-400">/hr</span>
                             </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); openChatSidebar(turf.OwnerID, null, 'Owner'); }} className="p-2 rounded-xl bg-white/10 text-white hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors border border-white/10" title="Contact Owner">
                            <i className="fi fi-rr-comment-alt"></i>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedTurf(turf); }} className="p-2 rounded-xl bg-white/10 text-white hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors border border-white/10" title="View Details">
                            <i className="fi fi-rr-picture"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {bookingForm.turfId === turf.TurfID ? (
                      <div className="space-y-5 animate-fade-in-up border-t border-white/10 pt-5 mt-5">
                        {/* 1. Date & Time */}
                        <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                             <i className="fi fi-rr-calendar-clock text-emerald-400"></i>
                             <h4 className="text-sm font-bold text-white">1. Select Schedule</h4>
                          </div>
                          <div className="relative group/input mb-4">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within/input:text-emerald-400 text-slate-500 transition-colors">
                                 <i className="fi fi-rr-calendar text-xs"></i>
                             </div>
                             <input type="date" value={bookingForm.bookingDate} min={new Date().toISOString().split('T')[0]}
                               onChange={e => handleDateChange(e, turf.TurfID)}
                               className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-inner" />
                          </div>

                          {bookingForm.bookingDate && (
                            <div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {HOURS.map(h => {
                                  const occ = isSlotOccupied(h), sel = isSlotSelected(h);
                                  return (
                                    <button key={h} onClick={() => handleSlotClick(h)} disabled={occ}
                                      className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all relative overflow-hidden ${occ ? 'bg-red-500/5 text-red-500/50 border border-red-500/10 cursor-not-allowed' : sel ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-[1.05]' : 'bg-black/40 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                                      {occ && <div className="absolute inset-0 pb-full border-t border-red-500/10 transform rotate-45 pointer-events-none"></div>}
                                      {String(h).padStart(2, '0')}:00
                                    </button>
                                  );
                                })}
                              </div>
                              {bookingForm.startTime && (
                                  <div className="mt-4 flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold w-fit mx-auto">
                                      <i className="fi fi-rr-time-forward"></i>
                                      <span>{bookingForm.startTime}</span>
                                      <i className="fi fi-rr-arrow-right text-[10px]"></i>
                                      <span>{bookingForm.endTime}</span>
                                  </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Game Settings (UC-05, UC-08) */}
                        <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                             <div className="flex items-center gap-2">
                                <i className="fi fi-rr-settings-sliders text-emerald-400"></i>
                                <h4 className="text-sm font-bold text-white">2. Game Settings</h4>
                             </div>
                          </div>
                          
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={bookingForm.visibility === 'PUBLIC'}
                                onChange={(e) => setBookingForm({ ...bookingForm, visibility: e.target.checked ? 'PUBLIC' : 'PRIVATE' })} />
                              <div className="w-5 h-5 border-2 border-slate-600 rounded-md peer-checked:bg-emerald-400 peer-checked:border-emerald-400 transition-colors shadow-inner"></div>
                              <i className="fi fi-rr-check absolute text-[10px] text-black opacity-0 peer-checked:opacity-100 font-bold transition-opacity"></i>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                  Make Match Public <i className="fi fi-rr-globe text-xs"></i>
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Allow solo players to join and fill your squad</p>
                            </div>
                          </label>

                          {bookingForm.visibility === 'PUBLIC' && (
                            <div className="pl-8 flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-2"><i className="fi fi-rr-users"></i> Max Players</span>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setBookingForm({...bookingForm, maxPlayers: Math.max(2, bookingForm.maxPlayers - 1)})} className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-white"><i className="fi fi-rr-minus-small"></i></button>
                                <span className="text-sm font-bold text-white w-6 text-center">{bookingForm.maxPlayers}</span>
                                <button type="button" onClick={() => setBookingForm({...bookingForm, maxPlayers: Math.min(22, bookingForm.maxPlayers + 1)})} className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-white"><i className="fi fi-rr-plus-small"></i></button>
                              </div>
                            </div>
                          )}

                          <label className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-white/5">
                            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={bookingForm.isRecurring}
                                onChange={(e) => setBookingForm({ ...bookingForm, isRecurring: e.target.checked })} />
                              <div className="w-5 h-5 border-2 border-slate-600 rounded-md peer-checked:bg-emerald-400 peer-checked:border-emerald-400 transition-colors shadow-inner"></div>
                              <i className="fi fi-rr-check absolute text-[10px] text-black opacity-0 peer-checked:opacity-100 font-bold transition-opacity"></i>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                  Weekly Subscription <i className="fi fi-rr-calendar-repeat text-xs"></i>
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Reserve this exact slot for 4 consecutive weeks</p>
                            </div>
                          </label>
                        </div>

                        {/* 3. Equipment Add-ons (UC-09) */}
                        <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                             <i className="fi fi-rr-box-open text-emerald-400"></i>
                             <h4 className="text-sm font-bold text-white">3. Equipment Add-ons</h4>
                          </div>
                          {equipmentList.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                              {equipmentList.map(eq => {
                                const isSelected = bookingForm.selectedEquipment.some(e => e.equipmentId === eq.equipmentId);
                                return (
                                  <button key={eq.equipmentId} onClick={() => toggleEquipment(eq)}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/5'}`}>
                                    <div>
                                      <p className={`text-sm font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-300'}`}>{eq.name}</p>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rs. {eq.pricePerHour} /hr</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                                      {isSelected && <i className="fi fi-rr-check text-[10px] text-black font-bold"></i>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 mt-2 italic px-2"><i className="fi fi-rr-info text-xs mr-1 text-slate-600"></i> No equipment add-ons available.</p>
                          )}
                        </div>

                        {/* Checkout */}
                        <div className="pt-2 flex gap-3">
                          <button onClick={() => submitBooking(turf.TurfID)} disabled={!bookingForm.startTime}
                            className="flex-1 py-3 rounded-xl bg-emerald-400 text-black font-extrabold disabled:opacity-40 disabled:bg-white/10 disabled:text-slate-500 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:scale-[1.02] transition-all flex items-center justify-between px-6 group disabled:hover:scale-100 disabled:shadow-none">
                            <span className="flex items-center gap-2">Confirm Booking <i className="fi fi-rr-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i></span>
                            <span className="bg-black/20 px-3 py-1 rounded-lg">Rs. {calculateTotal(turf.PricePerHour).toLocaleString('en-IN')}</span>
                          </button>
                          <button onClick={() => setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', visibility: 'PRIVATE', maxPlayers: 10, isRecurring: false, selectedEquipment: [] })}
                            className="px-6 py-3 rounded-xl bg-black/40 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-bold transition-all"><i className="fi fi-rr-cross"></i></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setBookingForm({ ...bookingForm, turfId: turf.TurfID }); }}
                        className="w-full mt-4 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-2 group">
                        <i className="fi fi-rr-calendar-plus"></i> Select Venue
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
            <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5">
              {['UPCOMING', 'COMPLETED', 'CANCELLED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 ${
                    bookingFilter === filter
                      ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="space-y-6">
                {visibleBookings.map(b => (
                  <BookingPoster 
                    key={b.BookingID} 
                    booking={b} 
                    onCancel={cancelBooking} 
                    onChat={() => openChatSidebar(null, b.TurfName + ' Squad', 'SQUAD', 'B_' + b.BookingID)} 
                    onToggleVisibility={toggleVisibility}
                    roleColor="emerald" 
                  />
                ))}
                {visibleBookings.length === 0 && <EmptyBookings />}
            </div>
          </div>
        )}

        {/* ═══ TAB: My Wallet ═══ */}
        {activeTab === 'wallet' && (
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-1 lg:p-2">
              <div className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2"><i className="fi fi-rr-time-past text-emerald-400"></i> Financial Ledger</h2>
                  <p className="text-sm text-slate-400 mt-1">Immutable record of all squad transactions</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-b-2xl border-t border-white/5">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-black/40 text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-5 rounded-tl-xl">Date</th>
                      <th className="px-6 py-5">Description</th>
                      <th className="px-6 py-5">Type</th>
                      <th className="px-6 py-5 text-right rounded-tr-xl">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {(wallet.transactions || []).map(t => (
                      <tr key={t.id} className="hover:bg-emerald-500/10 transition-colors group">
                        <td className="px-6 py-5 whitespace-nowrap text-slate-400 group-hover:text-emerald-200 transition-colors">{t.date?.substring(0, 10)}</td>
                        <td className="px-6 py-5 font-medium group-hover:text-white transition-colors">{t.description}</td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${
                            t.type === 'TOP_UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            t.type === 'REFUND' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {t.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-6 py-5 text-right font-black text-lg ${['TOP_UP', 'REFUND'].includes(t.type) ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {['TOP_UP', 'REFUND'].includes(t.type) ? '+' : '-'} Rs. {t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!wallet.transactions || wallet.transactions.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 bg-black/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <i className="fi fi-rr-wallet text-2xl text-emerald-400/50"></i>
                    </div>
                    <p className="text-slate-400 font-medium">No transactions found.</p>
                  </div>
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