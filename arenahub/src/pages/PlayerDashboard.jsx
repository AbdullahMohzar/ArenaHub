import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TurfDetailModal from '../components/TurfDetailModal';
import { collectTurfImageUrls, VenueImageCarousel } from '../components/VenueImageCarousel';
import GameCard from '../components/GameCard';
import BookingPoster, { EmptyBookings } from '../components/BookingPoster';

const API = 'http://localhost:8080';
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => interactive && onRate(star)}
        className={`text-lg transition-transform ${interactive ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${star <= rating ? 'text-white' : 'text-slate-600'}`}
      >★</button>
    ))}
  </div>
);

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  // ── State ──
  const [turfs, setTurfs] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [publicGames, setPublicGames] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [busySlots, setBusySlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [activeTab, setActiveTab] = useState('turfs');
  const [bookingFilter, setBookingFilter] = useState('UPCOMING');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/venues') setActiveTab('turfs');
    else if (location.pathname === '/my-games') setActiveTab('games');
    else if (location.pathname === '/wallet') setActiveTab('wallet');
    else if (location.pathname === '/dashboard') setActiveTab('bookings');
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
    selectedEquipment: [],
  });
  
  // Turf Detail Modal
  const [selectedTurf, setSelectedTurf] = useState(null);

  // Review
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Helper to open the global chat sidebar for direct messages
  const openChatSidebar = (contactUserId, contactName, contactRole, contactId = null) => {
    window.dispatchEvent(new CustomEvent('open-chat-sidebar', {
      detail: { contactId, contactUserId, contactName, contactRole }
    }));
  };

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

  const fetchPublicGames = async () => {
    try {
      const res = await fetch(`${API}/api/bookings?publicGames=true&userId=${userId}`, { headers });
      if (res.ok) setPublicGames(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API}/api/wallet?userId=${userId}`, { headers });
      if (res.ok) setWallet(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${API}/api/equipment`, { headers });
      if (res.ok) setEquipmentList(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => { fetchBookings(); fetchPublicGames(); fetchWallet(); fetchEquipment(); }, []);

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

  // Check if slot time has already passed (only for today)
  const isPastTime = (hour) => {
    if (!bookingForm.bookingDate) return false;
    const selectedDate = new Date(bookingForm.bookingDate).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Only check if booking date is today
    if (selectedDate !== today) return false;
    
    // Compare hour with current hour
    const currentHour = new Date().getHours();
    return hour < currentHour;
  };

  const handleSlotClick = (hour) => {
    if (isSlotOccupied(hour) || isPastTime(hour)) return;
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
        return {
          ...prev,
          selectedEquipment: prev.selectedEquipment.filter(e => e.equipmentId !== eq.equipmentId),
        };
      }

      return {
        ...prev,
        selectedEquipment: [...prev.selectedEquipment, { ...eq, quantity: 1, totalPrice: eq.pricePerHour }],
      };
    });
  };

  // ── Booking submission with payment simulation ──
  const submitBooking = async (turfId) => {
    if (!bookingForm.startTime || !bookingForm.endTime) return alert('Select a time slot.');
    setProcessingPayment(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST', headers,
        body: JSON.stringify({ userId: parseInt(userId), turfId, ...bookingForm, equipment: bookingForm.selectedEquipment })
      });
      const data = await res.json();
      if (res.ok) {
        setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', selectedEquipment: [] });
        setBusySlots([]);
        fetchBookings();
        fetchWallet();
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

  // ── Join public game ──
  const joinGame = async (bookingId) => {
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'PUT', headers,
        body: JSON.stringify({ bookingId, action: 'JOIN', userId: parseInt(userId) })
      });
      const data = await res.json();
      if (res.ok) { fetchPublicGames(); alert('🎉 ' + data.message); }
      else alert(data.error);
    } catch (err) { console.error(err); }
  };

  // ── Leave public game ──
  const leaveGame = async (bookingId) => {
    try {
      const res = await fetch(`${API}/api/squad/leave`, {
        method: 'DELETE', headers,
        body: JSON.stringify({ bookingId, userId: parseInt(userId) })
      });
      const data = await res.json();
      if (res.ok) { 
        fetchPublicGames(); 
      }
      else alert(data.error);
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
      if (res.ok) { setWallet(w => ({ ...w, balance: data.newBalance })); }
      else alert(data.error);
    } catch (err) { console.error(err); }
    finally { setToppingUp(false); }
  };

  // ── Submit review ──
  const submitReview = async () => {
    if (reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST', headers,
        body: JSON.stringify({
          userId: parseInt(userId),
          turfId: reviewingBooking.TurfID,
          bookingId: reviewingBooking.BookingID,
          rating: reviewRating,
          reviewText
        })
      });
      if (res.ok) {
        setReviewingBooking(null); setReviewRating(0); setReviewText('');
        fetchTurfs();
      }
    } catch (err) { console.error(err); }
    finally { setSubmittingReview(false); }
  };

  // Check if booking is in the past
  const isPastBooking = (b) => {
    const now = new Date();
    const end = new Date(`${b.BookingDate}T${b.EndTime}`);
    return end < now;
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
          <div className="w-14 h-14 border-4 border-white/20 border-t-white/50 rounded-full animate-spin" />
          <p className="text-white text-lg font-semibold mt-5">Processing Payment...</p>
          <p className="text-slate-400 text-sm mt-1">Please do not close this window</p>
        </div>
      )}

      {/* Review Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <h3 className="text-xl font-bold text-white mb-1">Rate Your Experience</h3>
            <p className="text-slate-400 text-sm mb-5">{reviewingBooking.TurfName} — {reviewingBooking.BookingDate}</p>
            <div className="flex justify-center mb-4">
              <StarRating rating={reviewRating} onRate={setReviewRating} interactive />
            </div>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Tell us about your experience (optional)..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setReviewingBooking(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/5">Cancel</button>
              <button onClick={submitReview} disabled={reviewRating === 0 || submittingReview}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-white to-zinc-200 text-black text-sm font-semibold disabled:opacity-50">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative mb-12 p-8 lg:p-10 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl group">
          {/* Decorative glowing background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                 <p className="text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase">Home Pitch</p>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-white font-extrabold uppercase leading-[0.95] tracking-wide drop-shadow-md">
                Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">Bench</span>
              </h1>
              <p className="text-slate-400 mt-5 max-w-lg text-sm sm:text-base leading-relaxed font-medium">
                Hunt venues, jump into public runs, and keep all your game-time bookings in your personal highlight reel.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center">
              <div className="glass p-6 md:p-8 min-w-[280px] rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group/card hover:border-emerald-500/30 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <i className="fi fi-rr-wallet text-emerald-400/80 text-sm"></i>
                            <span>My Wallet</span>
                        </div>
                        <button onClick={() => topUpWallet(1000)} disabled={toppingUp} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 disabled:opacity-50">
                            <i className="fi fi-rr-plus-small"></i> Add Rs.1k
                        </button>
                    </div>
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm flex items-baseline gap-1 group-hover/card:scale-105 transition-transform duration-300 mt-2">
                       <span className="text-2xl text-emerald-400/80 font-bold mr-1">Rs.</span> 
                       {wallet ? wallet.balance.toLocaleString('en-IN') : '...'}
                    </span>
                    <span className="block mt-3 text-[10px] text-slate-500 font-semibold tracking-wider">AVAILABLE FUNDS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-12 p-2 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {[
            { key: 'turfs', label: 'Browse Turfs', icon: '🏟️' },
            { key: 'games', label: 'Public Games', icon: '⚽' },
            { key: 'bookings', label: 'My Bookings', icon: '📋' },
            { key: 'wallet', label: 'My Wallet', icon: '💰' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`relative px-7 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3 ${activeTab === tab.key ? 'text-black bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
              <span className="text-lg">{tab.icon}</span>
               {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: Browse Turfs ═══ */}
        {activeTab === 'turfs' && (
          <div className="animate-fade-in-up">
            {/* Search & Filters */}
            <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-5 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <i className="fi fi-rr-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none"></i>
                  <input
                    type="text" placeholder="Search venues..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer relative z-10">
                  {sportTypes.map(s => <option key={s} value={s} className="bg-arena-950 text-white">{s === 'All' ? 'All Sports' : s}</option>)}
                </select>
                <div className="flex items-center gap-3 min-w-[200px] px-2">
                  <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Max Rs.{maxPrice}</span>
                  <input type="range" min="200" max="5000" step="100" value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 h-1.5 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Turf Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {turfs.map((turf) => {
                const turfUrls = collectTurfImageUrls(turf, API);
                return (
                <div key={turf.TurfID} className={`bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden group ${bookingForm.turfId === turf.TurfID ? 'border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/20' : 'border-white/10 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(52,211,153,0.1)]'}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '420px 760px' }}>
                  <div className="h-36 bg-slate-900 relative isolate border-b border-white/5">
                    <VenueImageCarousel urls={turfUrls} alt={turf.Name} emptyVariant="player" autoplay={false} />
                    {turfUrls.length > 1 && (
                      <span className="absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/60 text-white border border-white/10 backdrop-blur-sm">
                        {turfUrls.length} photos
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex gap-3 min-w-0">
                        {turfUrls[0] ? (
                          <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg bg-black/50">
                            <img src={turfUrls[0]} alt="" className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex flex-col justify-center">
                          <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors truncate">{turf.Name}</h3>
                          <div className="mt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {turf.SportType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-lg font-black text-emerald-400 drop-shadow-sm">Rs. {turf.PricePerHour}<span className="text-xs text-slate-500 font-medium">/hr</span></p>
                        <button onClick={(e) => { e.stopPropagation(); openChatSidebar(turf.OwnerID, null, 'Owner'); }} className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(52,211,153,0.15)] transition-all">
                          <i className="fi fi-rr-comment-alt text-[10px]"></i> Contact 
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedTurf(turf); }} className="mt-1.5 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-semibold border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                          <i className="fi fi-rr-picture text-[10px]"></i> Details 
                        </button>
                      </div>
                    </div>
                    {turf.AvgRating > 0 && (
                      <div className="flex items-center gap-1 mb-4 text-[13px] bg-black/20 w-fit px-2.5 py-1 rounded-md border border-white/5">
                        <StarRating rating={Math.round(turf.AvgRating)} />
                        <span className="text-slate-300 ml-1.5 font-medium">{turf.AvgRating} <span className="text-slate-500">({turf.ReviewCount})</span></span>
                      </div>
                    )}

                    {bookingForm.turfId === turf.TurfID ? (
                      <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
                        <input type="date" value={bookingForm.bookingDate} min={new Date().toISOString().split('T')[0]}
                          onChange={e => handleDateChange(e, turf.TurfID)}
                          className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium" />

                        {bookingForm.bookingDate && (
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <i className="fi fi-rr-time-quarter-to"></i>
                              {loadingSlots ? 'Loading Slots...' : 'Select Time Slot'}
                            </p>
                            <div className="grid grid-cols-6 gap-1.5">
                              {HOURS.map(h => {
                                const occ = isSlotOccupied(h), sel = isSlotSelected(h), past = isPastTime(h);
                                return (
                                  <button key={h} onClick={() => handleSlotClick(h)}
                                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                      past ? 'bg-white/5 text-slate-600 border-transparent cursor-not-allowed' : 
                                      occ ? 'bg-white/10 text-slate-500 border-transparent cursor-not-allowed' : 
                                      sel ? 'bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : 
                                      'bg-white/5 text-slate-300 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                                    }`}>
                                    {String(h).padStart(2, '0')}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-4 mt-4 px-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10" />Free</span>
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />Selected</span>
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white/10" />Busy</span>
                            </div>
                            {bookingForm.startTime && (
                              <p className="text-[13px] text-emerald-400 font-bold mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-2 bg-emerald-500/5 rounded-lg py-2">
                                <i className="fi fi-rr-clock text-xs"></i> 
                                {bookingForm.startTime}:00 — {bookingForm.endTime}:00
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button onClick={() => submitBooking(turf.TurfID)} disabled={!bookingForm.startTime}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-400 text-black text-sm font-black tracking-wide disabled:opacity-40 hover:bg-emerald-300 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all flex items-center justify-center gap-2">
                            <i className="fi fi-rs-bolt text-xs"></i> Book & Pay
                          </button>
                          <button onClick={() => { setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', selectedEquipment: [] }); setBusySlots([]); }}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                        </div>

                        {/* Equipment Add-ons */}
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5 mt-2">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fi fi-rr-box-open text-emerald-400/70"></i>
                              Equipment Add-ons
                            </h4>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Optional</span>
                          </div>
                          {equipmentList.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {equipmentList.map(eq => {
                                const isSelected = bookingForm.selectedEquipment.some(e => e.equipmentId === eq.equipmentId);
                                return (
                                  <button
                                    key={eq.equipmentId}
                                    type="button"
                                    onClick={() => toggleEquipment(eq)}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-300 ${isSelected ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'}`}
                                  >
                                    <div>
                                      <p className={`text-sm font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>{eq.name}</p>
                                      <p className={`text-[11px] font-black ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>+Rs. {eq.pricePerHour}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-inner ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600 bg-black/40'}`}>
                                      {isSelected && <i className="fi fi-rr-check text-[10px] text-black font-black leading-none mt-[1px]"></i>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic bg-white/5 p-3 rounded-lg border border-white/5 text-center">No gear available for this turf.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setBookingForm({ ...bookingForm, turfId: turf.TurfID }); }}
                        className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-[13px] font-black uppercase tracking-wider hover:bg-emerald-400 hover:text-black border border-emerald-500/30 hover:shadow-[0_0_25px_rgba(52,211,153,0.3)] transition-all flex justify-center items-center gap-2 group/book">
                        Reserve Pitch
                        <i className="fi fi-rr-arrow-right text-[10px] transition-transform group-hover/book:translate-x-1"></i>
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
              {turfs.length === 0 && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-black/20 rounded-3xl border border-white/5">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 text-slate-500/50">
                    <i className="fi fi-rr-search-alt text-2xl"></i>
                  </div>
                  <p className="text-slate-400 font-medium">No pitches match your current requirements.</p>
                </div>
              )}
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

        {/* ═══ TAB: Public Games ═══ */}
        {activeTab === 'games' && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {publicGames.map(game => (
                <GameCard 
                  key={game.BookingID} 
                  game={game} 
                  isJoined={game.HasJoined} 
                  onJoin={joinGame} 
                  onLeave={leaveGame} 
                  onChat={() => openChatSidebar(null, game.TurfName + ' Squad', 'SQUAD', 'B_' + game.BookingID)} 
                />
              ))}
              {publicGames.length === 0 && (
                <p className="text-slate-500 col-span-full text-center py-12">No public games available right now. Check back soon!</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: My Bookings ═══ */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in-up space-y-6">
            {/* Kinetic Filter Bar */}
            <div className="flex gap-3 mb-8 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-xl">
              {['UPCOMING', 'COMPLETED', 'CANCELLED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-7 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all duration-300 relative overflow-hidden group ${
                    bookingFilter === filter
                      ? 'bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.02]'
                      : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                     {filter === 'UPCOMING' && <i className="fi fi-rr-time-forward"></i>}
                     {filter === 'COMPLETED' && <i className="fi fi-rr-checkbox"></i>}
                     {filter === 'CANCELLED' && <i className="fi fi-rr-cross-circle"></i>}
                     {filter}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {visibleBookings.map(b => (
                <BookingPoster 
                  key={b.BookingID} 
                  booking={b} 
                  onCancel={cancelBooking} 
                  onChat={() => openChatSidebar(null, b.TurfName + ' Squad', 'SQUAD', 'B_' + b.BookingID)} 
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
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <i className="fi fi-rr-wallet text-emerald-400"></i> Transaction Ledger
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 font-medium">Verified top-ups and platform payments</p>
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
                    {(wallet.transactions || []).map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-emerald-500/10 transition-colors group group/row">
                        <td className="px-6 py-5 whitespace-nowrap text-slate-400 font-medium group-hover:text-emerald-200 transition-colors">
                          {t.date ? new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown Date'}
                        </td>
                        <td className="px-6 py-5 text-white font-medium group-hover:text-white transition-colors">{t.description}</td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            t.type === 'TOP_UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            t.type === 'REFUND' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {t.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-6 py-5 text-right font-black text-lg ${
                            ['TOP_UP', 'REFUND'].includes(t.type) ? 'text-emerald-400' : 'text-slate-300'
                          }`}>
                          {['TOP_UP', 'REFUND'].includes(t.type) ? '+' : '-'} Rs. {t.amount?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!wallet.transactions || wallet.transactions.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 bg-black/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                      <i className="fi fi-rr-receipt text-2xl text-emerald-400/50"></i>
                    </div>
                    <p className="text-slate-400 font-medium">No ledger activity found.</p>
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

export default PlayerDashboard;