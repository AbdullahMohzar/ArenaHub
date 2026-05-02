import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Search & Filter
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(5000);

  // Booking form
  const [bookingForm, setBookingForm] = useState({ turfId: null, bookingDate: '', startTime: '', endTime: '' });

  // Review
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
      const res = await fetch(`${API}/api/bookings?publicGames=true`, { headers });
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
      if (res.ok) fetchBookings();
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
    <div className="min-h-screen bg-arena-950">
      {/* Payment Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-14 h-14 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Player Dashboard</h1>
            <p className="text-slate-400 mt-1">Find venues, join games, and track your bookings</p>
          </div>
          {/* Wallet Card */}
          <div className="glass rounded-2xl px-6 py-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Wallet Balance</p>
              <p className="text-2xl font-bold text-emerald-400">Rs. {wallet.balance?.toLocaleString('en-IN') || 0}</p>
            </div>
            <button onClick={() => topUpWallet(1000)} disabled={toppingUp}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
              {toppingUp ? '...' : '+ Rs. 1,000'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
          {[
            { key: 'turfs', label: '🏟️ Browse Turfs', },
            { key: 'games', label: '⚽ Public Games', },
            { key: 'bookings', label: '📋 My Bookings', },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
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
              {turfs.map(turf => (
                <div key={turf.TurfID} className="glass rounded-2xl overflow-hidden group hover:border-emerald-500/30 transition-all">
                  {/* Turf image placeholder */}
                  <div className="h-36 bg-gradient-to-br from-emerald-900/40 to-arena-800 flex items-center justify-center">
                    <span className="text-5xl opacity-40">🏟️</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{turf.Name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{turf.SportType}</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-400">Rs. {turf.PricePerHour}<span className="text-xs text-slate-500">/hr</span></p>
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
                                const occ = isSlotOccupied(h), sel = isSlotSelected(h);
                                return (
                                  <button key={h} onClick={() => handleSlotClick(h)}
                                    className={`py-1.5 rounded text-xs font-semibold transition-all ${occ ? 'bg-rose-500/20 text-rose-400 cursor-not-allowed opacity-60' : sel ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                                    {String(h).padStart(2, '0')}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/10" />Free</span>
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
                      <button onClick={() => setBookingForm({ ...bookingForm, turfId: turf.TurfID })}
                        className="w-full mt-3 py-2.5 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10 border border-white/10 transition-all">
                        Book Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {turfs.length === 0 && <p className="text-slate-500 col-span-full text-center py-12">No venues found matching your criteria.</p>}
            </div>
          </div>
        )}

        {/* ═══ TAB: Public Games ═══ */}
        {activeTab === 'games' && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {publicGames.map(game => (
                <div key={game.BookingID} className="glass rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{game.TurfName}</h3>
                      <p className="text-sm text-slate-400">Hosted by <span className="text-emerald-400">{game.HostName}</span></p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{game.SportType}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-300 mb-4">
                    <span className="flex items-center gap-1">📅 {game.BookingDate}</span>
                    <span className="flex items-center gap-1">🕐 {game.StartTime?.substring(0,5)} — {game.EndTime?.substring(0,5)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {Array.from({ length: Math.min(game.CurrentPlayers, 4) }).map((_, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 border-2 border-arena-900 flex items-center justify-center text-[10px] text-white font-bold">P</div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">{game.CurrentPlayers}/{game.MaxPlayers} players</span>
                      </div>
                      <div className="w-32 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(game.CurrentPlayers / game.MaxPlayers) * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => joinGame(game.BookingID)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all">
                      Join Game
                    </button>
                  </div>
                </div>
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
            {myBookings.map(b => (
              <div key={b.BookingID} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{b.TurfName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.Status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{b.Status}</span>
                    {b.PaymentStatus === 'PAID' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">PAID</span>}
                  </div>
                  <p className="text-sm text-slate-400">📅 {b.BookingDate} &nbsp; 🕐 {b.StartTime?.substring(0,5)} — {b.EndTime?.substring(0,5)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {b.Status === 'CONFIRMED' && !isPastBooking(b) && (
                    <button onClick={() => cancelBooking(b.BookingID)} className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-sm hover:bg-rose-500/10 transition-all">Cancel</button>
                  )}
                  {b.Status === 'CONFIRMED' && isPastBooking(b) && (
                    <button onClick={() => { setReviewingBooking(b); setReviewRating(0); setReviewText(''); }}
                      className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all">
                      ⭐ Leave Review
                    </button>
                  )}
                </div>
              </div>
            ))}
            {myBookings.length === 0 && <p className="text-slate-500 text-center py-12">No bookings yet. Browse turfs to get started!</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;