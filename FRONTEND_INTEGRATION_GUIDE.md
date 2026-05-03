# Frontend Integration Guide - Squad JOIN & Chat Features
**Version:** May 3, 2026  
**Target:** React Components in `arenahub/src/`

---

## 📋 Overview

The backend Squad JOIN and Chat features are ready. This guide shows how to integrate them into the React frontend.

### New Endpoints to Integrate
- `POST /api/squad/join` — Join public squad (replaces old JOIN action)
- `DELETE /api/squad/leave` — Leave squad (already integrated, needs endpoint path update)
- `POST /api/chat/send` — Send direct/squad messages
- `PUT /api/chat/read` — Mark messages as read
- `GET /api/chat/contacts` — Get all conversations
- `GET /api/chat/messages?contactId=` — Get message thread

---

## 🔧 Integration Steps

### Step 1: Update PlayerDashboard.jsx - Fix Join/Leave Handlers

**Current Code (INCORRECT):**
```javascript
// ── Join public game ──
const joinGame = async (bookingId) => {
  try {
    const res = await fetch(`${API}/api/bookings`, {
      method: 'PUT', headers,
      body: JSON.stringify({ bookingId, action: 'JOIN', userId: parseInt(userId) })
    });
    // ...
  }
};
```

**Updated Code (CORRECT):**
```javascript
// ── Join public squad ──
const joinGame = async (bookingId) => {
  try {
    const res = await fetch(`${API}/api/squad/join`, {
      method: 'POST', headers,
      body: JSON.stringify({ bookingId: parseInt(bookingId), userId: parseInt(userId) })
    });
    const data = await res.json();
    if (res.ok) {
      fetchPublicGames(); 
      alert('✅ Successfully joined the squad!');
    } else {
      alert('❌ ' + (data.error || 'Could not join squad'));
    }
  } catch (err) {
    console.error('Join error:', err);
    alert('Error joining squad');
  }
};

// ── Leave squad (endpoint already correct) ──
const leaveGame = async (bookingId) => {
  if (!confirm('Leave this squad?')) return;
  try {
    const res = await fetch(`${API}/api/squad/leave`, {
      method: 'DELETE', headers,
      body: JSON.stringify({ bookingId: parseInt(bookingId), userId: parseInt(userId) })
    });
    const data = await res.json();
    if (res.ok) {
      fetchPublicGames();
      alert('👋 You left the squad');
    } else {
      alert('❌ ' + (data.error || 'Could not leave squad'));
    }
  } catch (err) {
    console.error('Leave error:', err);
  }
};
```

**Location in file:** Search for `const joinGame = async` (around line 175)

---

### Step 2: Update GameCard.jsx - Add Status Feedback

**Current Code:**
```javascript
<button onClick={() => onJoin(game.BookingID)}
  className="flex-1 px-5 py-3 border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-black font-space uppercase hover:bg-emerald-500 hover:text-black transition-colors tracking-widest">
  JOIN SQUAD
</button>
```

**Add Loading State:**
```javascript
// At component top, add prop for loading state
const GameCard = ({ game, onJoin, onLeave, onChat, isJoined, joinLoading, leaveLoading }) => {
  
  // ... existing code ...
  
  // In button:
  <button 
    onClick={() => onJoin(game.BookingID)}
    disabled={joinLoading}
    className="flex-1 px-5 py-3 border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-black font-space uppercase hover:bg-emerald-500 hover:text-black transition-colors tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
    {joinLoading ? 'JOINING...' : 'JOIN SQUAD'}
  </button>
```

**Location:** `arenahub/src/components/GameCard.jsx`

---

### Step 3: Create New ChatSidebar Component Integration

**Create file:** `arenahub/src/components/ChatIntegration.jsx`

```javascript
import React, { useState, useEffect, useCallback } from 'react';

export const useChatIntegration = (token, userId) => {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentContact, setCurrentContact] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Fetch all conversations (direct + squad)
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API || 'http://localhost:8080'}/api/chat/contacts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Fetch contacts error:', err);
    }
  }, [headers]);

  // Fetch messages for a contact
  const fetchMessages = useCallback(async (contactId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API || 'http://localhost:8080'}/api/chat/messages?contactId=${contactId}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Mark as read
        await fetch(
          `${process.env.REACT_APP_API || 'http://localhost:8080'}/api/chat/read?contactId=${contactId}`,
          { method: 'PUT', headers }
        );
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // Send message (direct or squad)
  const sendMessage = useCallback(async (contactId, content) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API || 'http://localhost:8080'}/api/chat/send`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ contactId, content })
        }
      );
      if (res.ok) {
        // Refresh messages and contacts
        await fetchMessages(contactId);
        await fetchContacts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Send message error:', err);
      return false;
    }
  }, [headers, fetchMessages, fetchContacts]);

  // Initial fetch
  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchContacts]);

  return {
    contacts,
    messages,
    currentContact,
    loading,
    setCurrentContact,
    fetchContacts,
    fetchMessages,
    sendMessage
  };
};

// Helper to determine contact type
export const getContactType = (contactId) => {
  return contactId.startsWith('U_') ? 'direct' : 'squad';
};

// Format contact ID
export const formatContactId = (type, id) => {
  return type === 'direct' ? `U_${id}` : `B_${id}`;
};
```

**Location:** Create `arenahub/src/components/ChatIntegration.jsx`

---

### Step 4: Update ChatWidget.jsx - Use New Endpoints

**In ChatWidget.jsx, update sendMessage handler:**

```javascript
const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!currentMessage.trim() || !currentContact) return;

  const contactId = currentContact.id; // e.g., "U_2" or "B_1"
  
  try {
    const res = await fetch(`${API}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactId: contactId,
        content: currentMessage.trim()
      })
    });

    if (res.ok) {
      setCurrentMessage('');
      // Refresh messages
      fetchMessages(contactId);
    } else {
      const error = await res.json();
      console.error('Send failed:', error);
    }
  } catch (err) {
    console.error('Send error:', err);
  }
};
```

---

### Step 5: Update ChatSidebar.jsx - Display Unread Counts

**Add unread badge to contact:**

```javascript
<div className="flex items-center justify-between mb-2">
  <span className="font-semibold text-white truncate">{contact.name}</span>
  {contact.unreadCount > 0 && (
    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
      {contact.unreadCount}
    </span>
  )}
</div>

{/* Last message preview */}
<p className="text-sm text-gray-400 truncate">
  {contact.lastMessage || 'No messages yet'}
</p>
```

---

### Step 6: Add Toast Notifications for Squad Actions

**Create file:** `arenahub/src/utils/toast.js`

```javascript
// Simple toast notification system
export const showToast = (message, type = 'info') => {
  const event = new CustomEvent('toast', {
    detail: { message, type, id: Date.now() }
  });
  window.dispatchEvent(event);
};

// Usage in components:
// showToast('✅ Joined squad!', 'success');
// showToast('❌ Squad is full', 'error');
// showToast('⏳ Loading...', 'info');
```

**Update PlayerDashboard to use toast:**
```javascript
import { showToast } from '../utils/toast';

const joinGame = async (bookingId) => {
  showToast('🔄 Joining squad...', 'info');
  try {
    const res = await fetch(`${API}/api/squad/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId: parseInt(bookingId), userId: parseInt(userId) })
    });
    const data = await res.json();
    if (res.ok) {
      fetchPublicGames();
      showToast('✅ ' + data.message, 'success');
    } else {
      showToast('❌ ' + data.error, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Connection error', 'error');
  }
};
```

---

## 🧪 Testing Checklist

### Frontend Testing
- [ ] Open `http://localhost:3000/my-games` (public games tab)
- [ ] See list of PUBLIC bookings with squad capacity
- [ ] Click "JOIN SQUAD" button
- [ ] Verify button changes to "SQUAD CHAT" and "LEAVE GAME"
- [ ] Verify squad capacity increments in real-time
- [ ] Click "SQUAD CHAT" → opens chat sidebar
- [ ] Type message → appears in squad chat
- [ ] Other users see message instantly (refresh to verify)
- [ ] Click "LEAVE GAME" → button reverts to "JOIN SQUAD"
- [ ] Try joining full squad → error toast "Squad is full"
- [ ] Try joining private squad → error toast "This booking is private"

### API Integration Testing
1. **Endpoint Response Validation:**
   - POST /api/squad/join returns: `{ message, bookingId, newCurrentPlayers }`
   - DELETE /api/squad/leave returns: `{ message }`
   - POST /api/chat/send returns: `{ message: "Message sent" }`
   - GET /api/chat/contacts returns: Array of contacts with unreadCount

2. **Error Handling:**
   - Missing bookingId → 400 error
   - Duplicate join → 400 error "Already in squad"
   - Full squad → 400 error "Squad is full"
   - Private booking → 403 error "This booking is private"

3. **Real-time Updates:**
   - Join squad → immediate UI update
   - Send message → appears without page refresh
   - Unread count → decrements after viewing

---

## 📦 Environment Setup

**In `.env` (frontend root):**
```
REACT_APP_API=http://localhost:8080
REACT_APP_CHAT_REFRESH_INTERVAL=5000
```

**In package.json (if not already):**
```json
{
  "proxy": "http://localhost:8080"
}
```

---

## 🔐 Security Notes

1. **Token Validation:** Always include Bearer token in Authorization header
2. **CORS:** Backend has `Access-Control-Allow-Origin: *` (consider restricting in production)
3. **Input Sanitization:** Frontend should trim/validate user input before sending
4. **Rate Limiting:** Consider adding on backend for chat endpoints (multiple messages per second)

---

## 🚀 Deployment Checklist

- [ ] Test locally with backend running
- [ ] Verify all toast messages display
- [ ] Check console for no JavaScript errors
- [ ] Test on mobile (responsive design)
- [ ] Verify chat messages persist after page refresh
- [ ] Test with multiple browser tabs (real-time sync)
- [ ] Clear localStorage and test login flow

---

## 📊 Performance Tips

1. **Chat Refresh:**
   - Current: Every 5 seconds (defined in ChatIntegration)
   - Consider: Increase to 10s for production (less server load)

2. **Image Caching:**
   - Turf images already cached via vite.config.js proxy
   - User avatars: consider adding CDN or lazy loading

3. **Message Pagination:**
   - Current: Loads all messages at once
   - Future: Implement pagination (last 50 messages, load older on scroll)

---

## 🐛 Troubleshooting

### Squad JOIN shows "Squad is full" but seats visible
- Verify CurrentPlayers sync on backend
- Check if another user is joining concurrently
- Refresh page to see latest state

### Chat messages not appearing
- Check token validity: `localStorage.getItem('token')`
- Verify contactId format: "U_2" for direct, "B_1" for squad
- Check browser console for API errors

### Unread count not updating
- Verify message sender ID differs from current user
- Clear cache and refresh
- Check PUT /api/chat/read is being called

---

## 📚 Related Files

- **Backend:** `d:\ArenaHub\backend\src\main\java\com\arenahub\controllers\`
  - `SquadJoinServlet.java`
  - `ChatServlet.java`
  - `BookingServlet.java`

- **Frontend:**
  - `arenahub/src/pages/PlayerDashboard.jsx`
  - `arenahub/src/components/GameCard.jsx`
  - `arenahub/src/components/ChatWidget.jsx`
  - `arenahub/src/components/ChatSidebar.jsx`

