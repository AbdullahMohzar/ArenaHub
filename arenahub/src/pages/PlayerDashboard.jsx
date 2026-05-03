import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TurfDetailModal from '../components/TurfDetailModal';
import { collectTurfImageUrls, VenueImageCarousel } from '../components/VenueImageCarousel';
import GameCard from '../components/GameCard';
import BookingPoster, { EmptyBookings } from '../components/BookingPoster';
import BroadcastLayout from '../components/BroadcastLayout';
import FootballSpinner from '../components/FootballSpinner';
import ScoreboardNumber from '../components/ScoreboardNumber';

const API = 'http://localhost:8080';
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => interactive && onRate(star)}
        className={`text-lg transition-transform ${interactive ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${star <= rating ? 'text-amber-400' : 'text-slate-600'}`}
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
  const [bookingForm, setBookingForm] = useState({ turfId: null, bookingDate: '', startTime: '', endTime: '' });
  
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

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => { fetchBookings(); fetchPublicGames(); fetchWallet(); }, []);

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

  // ── Booking submission with payment simulation ──
  const submitBooking = async (turfId) => {
    if (!bookingForm.startTime || !bookingForm.endTime) return alert('Select a time slot.');
    setProcessingPayment(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST', headers,
        body: JSON.stringify({ userId: parseInt(userId), turfId, ...bookingForm })
      });
      const data = await res.json();
      if (res.ok) {
        setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '' });
        setBusySlots([]);
        fetchBookings();
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

  return (
    <div className="min-h-screen bg-arena-950 pitch-tactical-grid">
      {/* Payment Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <FootballSpinner loading={processingPayment} label="Processing payment" size={34} />
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
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setReviewingBooking(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/5">Cancel</button>
              <button onClick={submitReview} disabled={reviewRating === 0 || submittingReview}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BroadcastLayout className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="sports-kicker mb-1">Home pitch</p>
            <h1 className="font-display text-4xl sm:text-5xl text-white uppercase tracking-wide">Player bench</h1>
            <p className="text-slate-400 mt-2 text-sm max-w-lg">Hunt venues, jump into public runs, and keep every booking in your highlight reel.</p>
          </div>
          {/* Wallet Card */}
          <div className="glass px-6 py-4 flex items-center gap-4 border-2 border-emerald-500/20">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Wallet Balance</p>
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-emerald-400">
                <span>Rs.</span>
                <ScoreboardNumber
                  value={wallet.balance || 0}
                  formatter={(num) => Number(num || 0).toLocaleString('en-IN')}
                  className="text-emerald-300"
                />
              </div>
            </div>
            <button onClick={() => topUpWallet(1000)} disabled={toppingUp}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-sm font-semibold border-2 border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
              {toppingUp ? '...' : '+ Rs. 1,000'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 p-1.5 glass mb-6 w-fit ring-1 ring-white/5 border-2 border-white/10">
          {[
            { key: 'turfs', label: '🏟️ Browse Turfs', },
            { key: 'games', label: '⚽ Public Games', },
            { key: 'bookings', label: '📋 My Bookings', },
            { key: 'wallet', label: '💰 My Wallet', },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === tab.key ? 'bg-emerald-500/15 text-white border-emerald-400 shadow-[0_0_20px_-8px_rgba(52,211,153,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: Browse Turfs ═══ */}
        {activeTab === 'turfs' && (
          <div className="animate-fade-in-up">
            {/* Search & Filters */}
            <div className="glass rounded-2xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text" placeholder="Search venues..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none">
                  {sportTypes.map(s => <option key={s} value={s} className="bg-arena-900">{s === 'All' ? 'All Sports' : s}</option>)}
                </select>
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Max Rs.{maxPrice}</span>
                  <input type="range" min="200" max="5000" step="100" value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1.5" />
                </div>
              </div>
            </div>

            {/* Turf Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {turfs.map((turf) => {
                const turfUrls = collectTurfImageUrls(turf, API);
                return (
                <div key={turf.TurfID} className={`glass rounded-2xl overflow-hidden group transition-all duration-300 ${bookingForm.turfId === turf.TurfID ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'hover:border-emerald-500/30'}`}>
                  <div className="h-36 bg-slate-800 relative isolate">
                    <VenueImageCarousel urls={turfUrls} alt={turf.Name} emptyVariant="player" />
                    {turfUrls.length > 1 && (
                      <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/55 text-white border border-white/10 backdrop-blur-sm">
                        {turfUrls.length} photos
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex gap-2.5 min-w-0">
                        {turfUrls[0] ? (
                          <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-emerald-500/40 shrink-0 shadow-md ring-1 ring-white/10 bg-slate-900">
                            <img src={turfUrls[0]} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">{turf.Name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{turf.SportType}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">Rs. {turf.PricePerHour}<span className="text-xs text-slate-500">/hr</span></p>
                        <button onClick={(e) => { e.stopPropagation(); openChatSidebar(turf.OwnerID, null, 'Owner'); }} className="mt-1 flex items-center justify-end w-full gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
                          💬 Contact Owner
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedTurf(turf); }} className="mt-1 flex items-center justify-end w-full gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 hover:bg-emerald-500/30 transition-all">
                          🖼️ View Details
                        </button>
                      </div>
                    </div>
                    {turf.AvgRating > 0 && (
                      <div className="flex items-center gap-1 mb-3 text-sm">
                        <StarRating rating={Math.round(turf.AvgRating)} />
                        <span className="text-slate-400 ml-1">{turf.AvgRating} ({turf.ReviewCount})</span>
                      </div>
                    )}

                    {bookingForm.turfId === turf.TurfID ? (
                      <div className="space-y-3 mt-3 pt-3 border-t border-white/10">
                        <input type="date" value={bookingForm.bookingDate} min={new Date().toISOString().split('T')[0]}
                          onChange={e => handleDateChange(e, turf.TurfID)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />

                        {bookingForm.bookingDate && (
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{loadingSlots ? 'Loading...' : 'Select Time'}</p>
                            <div className="grid grid-cols-6 gap-1.5">
                              {HOURS.map(h => {
                                const occ = isSlotOccupied(h), sel = isSlotSelected(h), past = isPastTime(h);
                                return (
                                  <button key={h} onClick={() => handleSlotClick(h)}
                                    className={`py-1.5 rounded text-xs font-semibold transition-all ${past ? 'bg-red-500/20 text-red-400 cursor-not-allowed opacity-60' : occ ? 'bg-rose-500/20 text-rose-400 cursor-not-allowed opacity-60' : sel ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                                    {String(h).padStart(2, '0')}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/10" />Free</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50" />Past Time</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500/50" />Busy</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Selected</span>
                            </div>
                            {bookingForm.startTime && <p className="text-sm text-emerald-400 font-semibold mt-2">🕐 {bookingForm.startTime} — {bookingForm.endTime}</p>}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button onClick={() => submitBooking(turf.TurfID)} disabled={!bookingForm.startTime}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-40 shadow-lg shadow-emerald-500/20">
                            💳 Book & Pay
                          </button>
                          <button onClick={() => { setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '' }); setBusySlots([]); }}
                            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setBookingForm({ ...bookingForm, turfId: turf.TurfID }); }}
                        className="w-full mt-3 py-2.5 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10 border border-white/10 transition-all">
                        Book Now
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
              {turfs.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No venues found matching your criteria.</p>}
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
          <div className="animate-fade-in-up space-y-3">
            {/* Kinetic Filter Bar */}
            <div className="flex gap-2 mb-6">
              {['UPCOMING', 'COMPLETED', 'CANCELLED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-6 py-2 font-black font-space uppercase text-sm border-2 transition-colors ${
                    bookingFilter === filter
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'border-white/20 text-white hover:border-emerald-500/50 hover:text-emerald-400'
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
                roleColor="emerald" 
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
            <div className="glass rounded-2xl overflow-hidden border border-emerald-500/10">
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
                            t.type === 'TOP_UP' ? 'bg-emerald-500/10 text-emerald-400' :
                            t.type === 'REFUND' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${['TOP_UP', 'REFUND'].includes(t.type) ? 'text-emerald-400' : 'text-white'}`}>
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
      </BroadcastLayout>
    </div>
  );
};

export default PlayerDashboard;