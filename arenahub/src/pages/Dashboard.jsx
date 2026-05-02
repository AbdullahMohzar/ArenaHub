import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const [turfs, setTurfs] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  
  // Active booking form state per turf
  const [bookingForm, setBookingForm] = useState({
    turfId: null,
    bookingDate: '',
    startTime: '',
    endTime: ''
  });

  const fetchMyBookings = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const response = await fetch(`http://localhost:8080/api/bookings?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMyBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/turfs');
        if (response.ok) {
          const data = await response.json();
          setTurfs(data);
        } else {
          console.error("Failed to fetch turfs status: ", response.status);
        }
      } catch (error) {
        console.error("Error fetching turfs:", error);
      }
    };

    fetchTurfs();
    fetchMyBookings();
  }, []);

  const handleBookingChange = (e) => {
    setBookingForm({ ...bookingForm, [e.target.name]: e.target.value });
  };

  const submitBooking = async (turfId) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('You must be logged in to book.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          turfId: turfId,
          bookingDate: bookingForm.bookingDate,
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setBookingForm({ turfId: null, bookingDate: '', startTime: '', endTime: '' }); // Reset form
        fetchMyBookings(); // Refresh bookings instantly
      } else {
        alert(data.error || 'Failed to book');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Error creating booking');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Arena Hub Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {localStorage.getItem('userRole') === 'ADMIN' && (
            <button 
              onClick={() => navigate('/admin')} 
              style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Go to Admin Panel
            </button>
          )}
          <button 
            onClick={handleLogout} 
            style={{ padding: '0.5rem 1rem', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </div>

      <h2 style={{ color: '#555' }}>Available Turfs</h2>
      
      {/* Grid Layout for Turfs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {turfs.map(turf => (
          <div key={turf.TurfID} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fafafa', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>{turf.Name}</h3>
            <p style={{ margin: '0.5rem 0' }}><strong>Sport:</strong> {turf.SportType}</p>
            <p style={{ margin: '0.5rem 0' }}><strong>Price:</strong> Rs. {turf.PricePerHour} / hr</p>
            
            {bookingForm.turfId === turf.TurfID ? (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="date" name="bookingDate" value={bookingForm.bookingDate} onChange={handleBookingChange} required />
                <input type="time" name="startTime" value={bookingForm.startTime} onChange={handleBookingChange} required />
                <input type="time" name="endTime" value={bookingForm.endTime} onChange={handleBookingChange} required />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => submitBooking(turf.TurfID)} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirm</button>
                  <button onClick={() => setBookingForm({ ...bookingForm, turfId: null })} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setBookingForm({ ...bookingForm, turfId: turf.TurfID })}
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem', fontWeight: 'bold' }}>
                Book This Turf
              </button>
            )}
          </div>
        ))}
      </div>

      {/* My Bookings Ledger */}
      <div style={{ marginTop: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
        <h2 style={{ color: '#555' }}>My Upcoming Games</h2>
        {myBookings.length === 0 ? (
          <p>You have no upcoming bookings.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Turf</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Time</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {myBookings.map((booking) => (
                <tr key={booking.BookingID}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>{booking.TurfName}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>{booking.BookingDate}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>{booking.StartTime} - {booking.EndTime}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid #ddd', color: booking.Status === 'CONFIRMED' ? 'green' : 'orange' }}>
                    {booking.Status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default Dashboard;