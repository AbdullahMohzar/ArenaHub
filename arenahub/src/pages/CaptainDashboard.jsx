import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Search & Filter
  const [search, setSearch] = useState('');

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

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Fetchers ──
  const fetchTurfs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/turfs${search ? `?search=${search}` : ''}`);
      if (res.ok) setTurfs(await res.json());
    } catch (err) { console.error(err); }
  }, [search]);

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

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => { fetchBookings(); fetchEquipment(); }, []);

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
      if (res.ok) fetchBookings();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-arena-950">
      {/* Payment Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-14 h-14 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-white text-lg font-semibold mt-5">Processing Squad Payment...</p>
          <p className="text-slate-400 text-sm mt-1">Please wait while we secure your slot</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-bold text-white">Captain's Dashboard</h1>
          <p className="text-slate-400 mt-1">Organize matches, secure recurring slots, and rent squad equipment.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
          <button onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'book' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            🛡️ Book & Manage
          </button>
          <button onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'bookings' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            📋 Squad Bookings
          </button>
        </div>

        {/* ═══ TAB: Book & Manage ═══ */}
        {activeTab === 'book' && (
          <div className="animate-fade-in-up">
            <div className="glass rounded-2xl p-5 mb-6">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text" placeholder="Search venues by name..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {turfs.map(turf => (
                <div key={turf.TurfID} className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${bookingForm.turfId === turf.TurfID ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'hover:border-white/20'}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{turf.Name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-300 mt-1">{turf.SportType}</span>
                      </div>
                      <p className="text-xl font-bold text-amber-400">Rs. {turf.PricePerHour}<span className="text-sm text-slate-500">/hr</span></p>
                    </div>

                    {bookingForm.turfId === turf.TurfID ? (
                      <div className="space-y-5 animate-fade-in-up">
                        {/* 1. Date & Time */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <h4 className="text-sm font-semibold text-white mb-3">1. Select Schedule</h4>
                          <input type="date" value={bookingForm.bookingDate} min={new Date().toISOString().split('T')[0]}
                            onChange={e => handleDateChange(e, turf.TurfID)}
                            className="w-full px-3 py-2 bg-arena-950 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-4" />

                          {bookingForm.bookingDate && (
                            <div>
                              <div className="grid grid-cols-6 gap-1.5">
                                {HOURS.map(h => {
                                  const occ = isSlotOccupied(h), sel = isSlotSelected(h);
                                  return (
                                    <button key={h} onClick={() => handleSlotClick(h)}
                                      className={`py-2 rounded text-xs font-semibold transition-all ${occ ? 'bg-rose-500/20 text-rose-400 cursor-not-allowed opacity-60' : sel ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                                      {String(h).padStart(2, '0')}
                                    </button>
                                  );
                                })}
                              </div>
                              {bookingForm.startTime && <p className="text-sm text-amber-400 font-semibold mt-3 text-center">Selected: {bookingForm.startTime} — {bookingForm.endTime}</p>}
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
                              <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors"></div>
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
                              <div className="w-5 h-5 border-2 border-slate-500 rounded peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors"></div>
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {equipmentList.map(eq => {
                              const isSelected = bookingForm.selectedEquipment.some(e => e.equipmentId === eq.equipmentId);
                              return (
                                <button key={eq.equipmentId} onClick={() => toggleEquipment(eq)}
                                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500/50' : 'bg-arena-950 border-white/10 hover:border-white/20'}`}>
                                  <div>
                                    <p className={`text-sm font-medium ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>{eq.name}</p>
                                    <p className="text-xs text-slate-500">+Rs. {eq.pricePerHour}</p>
                                  </div>
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-500'}`}>
                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Checkout */}
                        <div className="pt-2 flex gap-3">
                          <button onClick={() => submitBooking(turf.TurfID)} disabled={!bookingForm.startTime}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold disabled:opacity-40 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-between px-6">
                            <span>Checkout</span>
                            <span>Rs. {calculateTotal(turf.PricePerHour).toLocaleString('en-IN')}</span>
                          </button>
                          <button onClick={() => setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '', visibility: 'PRIVATE', maxPlayers: 10, isRecurring: false, selectedEquipment: [] })}
                            className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 font-medium transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setBookingForm({ ...bookingForm, turfId: turf.TurfID })}
                        className="w-full mt-2 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 border border-white/10 transition-all">
                        Select Venue
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: Squad Bookings ═══ */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in-up space-y-4">
            {myBookings.map(b => (
              <div key={b.BookingID} className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{b.TurfName}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${b.Status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{b.Status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                    <div><span className="text-slate-500">Date:</span> <span className="text-slate-300 ml-1">{b.BookingDate}</span></div>
                    <div><span className="text-slate-500">Time:</span> <span className="text-slate-300 ml-1">{b.StartTime?.substring(0,5)} - {b.EndTime?.substring(0,5)}</span></div>
                    <div><span className="text-slate-500">Type:</span> <span className={`ml-1 font-medium ${b.Visibility === 'PUBLIC' ? 'text-cyan-400' : 'text-slate-300'}`}>{b.Visibility}</span></div>
                    {b.Visibility === 'PUBLIC' && (
                      <div><span className="text-slate-500">Players:</span> <span className="text-slate-300 ml-1">{b.CurrentPlayers} / {b.MaxPlayers}</span></div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center sm:min-w-[140px]">
                  {b.Status === 'CONFIRMED' && (
                    <button onClick={() => cancelBooking(b.BookingID)} className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-all">Cancel Booking</button>
                  )}
                  {b.PaymentStatus === 'PAID' && (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center border border-emerald-500/20">PAYMENT SECURED</div>
                  )}
                </div>
              </div>
            ))}
            {myBookings.length === 0 && <p className="text-slate-500 text-center py-12">No squad bookings found.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainDashboard;