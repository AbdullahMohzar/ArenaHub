import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8080';

const ROLE_COLORS = {
  Player: 'from-zinc-400 to-zinc-600',
  Captain: 'from-zinc-400 to-zinc-600',
  Owner: 'from-zinc-400 to-zinc-600',
  Admin: 'from-zinc-400 to-zinc-600',
};

const ROLE_BADGE = {
  Player: 'bg-white/10 text-zinc-200',
  Captain: 'bg-white/10 text-zinc-200',
  Owner: 'bg-white/10 text-zinc-200',
};

const ChatSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    };
  };

  // ── Fetch contacts list ──
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API}/api/chat/contacts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        // data contains objects with id, name, role, lastMessage, unreadCount, etc.
        setContacts(data);
        setTotalUnread(data.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
      }
    } catch (err) { console.error('Error fetching contacts:', err); }
  };

  // ── Fetch messages for active contact ──
  const fetchMessages = async (contactId) => {
    try {
      const res = await fetch(`${API}/api/chat/messages?contactId=${contactId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) { console.error('Error fetching messages:', err); }
  };

  // ── Mark messages as read ──
  const markAsRead = async (contactId) => {
    try {
      await fetch(`${API}/api/chat/read?contactId=${contactId}`, { 
        method: 'PUT', 
        headers: getHeaders() 
      });
    } catch (err) { console.error('Error marking as read:', err); }
  };

  // ── Send message ──
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;
    try {
      const res = await fetch(`${API}/api/chat/send`, {
        method: 'POST', 
        headers: getHeaders(),
        body: JSON.stringify({ contactId: activeContact.id, content: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages(activeContact.id);
        fetchContacts();
      }
    } catch (err) { console.error('Error sending message:', err); }
  };

  // ── Open a conversation ──
  const openChat = (contact) => {
    setActiveContact(contact);
    fetchMessages(contact.id);
    markAsRead(contact.id);
  };

  // ── Listen for "open-chat-sidebar" custom events from dashboard buttons ──
  useEffect(() => {
    const handler = (e) => {
      // contactId should be passed now, or we fallback to 'U_' + contactUserId
      const { contactId, contactUserId, contactName, contactRole } = e.detail;
      const finalContactId = contactId || ('U_' + contactUserId);
      setIsOpen(true);
      const existing = contacts.find(c => c.id === finalContactId);
      if (existing) {
        openChat(existing);
      } else {
        // Create a temporary contact entry
        const temp = { id: finalContactId, name: contactName || 'User', role: contactRole || 'Player', lastMessage: '', unreadCount: 0 };
        openChat(temp);
      }
    };
    window.addEventListener('open-chat-sidebar', handler);
    return () => window.removeEventListener('open-chat-sidebar', handler);
  }, [contacts]);

  // ── Listen for "toggle-chat-sidebar" from Navbar button ──
  useEffect(() => {
    const handler = () => {
      setIsOpen(prev => {
        if (prev) setActiveContact(null);
        return !prev;
      });
      fetchContacts();
    };
    window.addEventListener('toggle-chat-sidebar', handler);
    return () => window.removeEventListener('toggle-chat-sidebar', handler);
  }, []);

  // ── Polling ──
  useEffect(() => {
    if (!token || !userId) return;
    fetchContacts();
    const contactsPoll = setInterval(fetchContacts, 8000);
    return () => clearInterval(contactsPoll);
  }, [token]);

  useEffect(() => {
    if (!activeContact) return;
    const msgPoll = setInterval(() => fetchMessages(activeContact.id), 5000);
    return () => clearInterval(msgPoll);
  }, [activeContact]);

  // ── Auto-scroll messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when chat opens ──
  useEffect(() => {
    if (activeContact) setTimeout(() => inputRef.current?.focus(), 200);
  }, [activeContact]);

  // ── Time formatting ──
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();

  if (!token || !userId || userRole === 'ADMIN') return null;

  return (
    <>
      {/* ── Floating Chat Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-white to-zinc-300 text-black shadow-2xl shadow-white/20 hover:shadow-white/30 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          id="chat-sidebar-toggle"
        >
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-zinc-700 text-white text-[11px] font-bold flex items-center justify-center animate-pulse shadow-lg">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* ── Sidebar Overlay ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
            onClick={() => { setIsOpen(false); setActiveContact(null); }}
          />

          {/* Sidebar Panel */}
          <div className="relative w-full max-w-[400px] h-full pointer-events-auto flex flex-col bg-arena-950/95 backdrop-blur-xl border-l border-white/15 shadow-2xl shadow-black/50 animate-slide-in-right">

            {/* ── Header ── */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              {activeContact ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveContact(null)} className="text-slate-400 hover:text-white transition-colors p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${ROLE_COLORS[activeContact.role] || ROLE_COLORS.Player} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                    {(activeContact.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{activeContact.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[activeContact.role] || 'bg-slate-500/20 text-slate-400'}`}>
                      {activeContact.role}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h2 className="text-white font-bold text-base">Messages</h2>
                  {totalUnread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => { setIsOpen(false); setActiveContact(null); }}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Content Area ── */}
            {activeContact ? (
              /* ── Chat Messages View ── */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${ROLE_COLORS[activeContact.role] || ROLE_COLORS.Player} flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg`}>
                        {(activeContact.name || 'U')[0].toUpperCase()}
                      </div>
                      <p className="text-slate-400 text-sm">No messages yet with <span className="text-white font-semibold">{activeContact.name}</span></p>
                      <p className="text-slate-500 text-xs mt-1">Send a message to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map(m => {
                      const isMe = m.senderId === parseInt(userId);
                      return (
                        <div key={m.messageId} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-br from-white to-zinc-200 text-black rounded-br-md shadow-md shadow-white/15'
                              : 'bg-white/10 text-slate-200 rounded-bl-md'
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 px-1">{formatTime(m.createdAt)}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Message Input ── */}
                <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-arena-950/80 flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-white to-zinc-200 hover:from-zinc-200 hover:to-zinc-300 disabled:opacity-40 text-black px-4 rounded-xl transition-all shadow-md shadow-white/15 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              /* ── Contact List View ── */
              <div className="flex-1 overflow-y-auto min-h-0">
                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No conversations yet</p>
                    <p className="text-slate-500 text-xs mt-1">Use "Contact Owner" or "Chat Captain" to start messaging</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => openChat(contact)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all text-left group"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${ROLE_COLORS[contact.role] || ROLE_COLORS.Player} flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow`}>
                            {(contact.name || 'U')[0].toUpperCase()}
                          </div>
                          {contact.unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-700 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-sm font-semibold ${contact.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                              {contact.name}
                            </span>
                            <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                              {formatTime(contact.lastMessageTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate max-w-[200px] ${contact.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                              {contact.lastMessage || 'Start a conversation'}
                            </p>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${ROLE_BADGE[contact.role] || 'bg-slate-500/20 text-slate-400'}`}>
                              {contact.role}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default ChatSidebar;
