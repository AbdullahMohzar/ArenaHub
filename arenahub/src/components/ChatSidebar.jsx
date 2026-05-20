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
    if (!token || !userId || !isOpen) return;
    fetchContacts();
    const contactsPoll = setInterval(fetchContacts, 8000);
    return () => clearInterval(contactsPoll);
  }, [token, userId, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeContact) return;
    const msgPoll = setInterval(() => fetchMessages(activeContact.id), 5000);
    return () => clearInterval(msgPoll);
  }, [activeContact, isOpen]);

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
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-accent via-accent/90 to-yellow-600 text-black shadow-[0_0_30px_rgba(237,109,64,0.3)] hover:shadow-[0_0_40px_rgba(237,109,64,0.5)] hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center group overflow-hidden"
          id="chat-sidebar-toggle"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <svg className="w-7 h-7 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-black text-[12px] font-black border-2 border-[#121212] flex items-center justify-center animate-pulse shadow-lg">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* ── Sidebar Overlay ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-500"
            onClick={() => { setIsOpen(false); setActiveContact(null); }}
          />

          {/* Sidebar Panel */}
          <div className="relative w-full sm:max-w-md h-full pointer-events-auto flex flex-col bg-white/[0.02] backdrop-blur-2xl sm:rounded-3xl border-l sm:border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-slide-in-right overflow-hidden ring-1 ring-white/5">
            {/* Glossy Corner Highlights */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* ── Header ── */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md relative z-10">
              {activeContact ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveContact(null)} className="text-slate-400 hover:text-white hover:bg-white/10 transition-colors p-2 rounded-xl">
                    <i className="fi fi-rr-angle-left text-lg flex items-center justify-center"></i>
                  </button>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_COLORS[activeContact.role] || 'from-white/10 to-white/5'} border border-white/10 flex items-center justify-center text-white text-base font-black shadow-lg`}>
                    {(activeContact.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-white font-bold text-sm tracking-wide drop-shadow-sm">{activeContact.name}</p>
                    <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-widest px-2 py-0.5 rounded-md w-fit ${ROLE_BADGE[activeContact.role] || 'bg-white/10 text-slate-300'}`}>
                      {activeContact.role}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(237,109,64,0.2)]">
                      <i className="fi fi-rr-messages text-lg"></i>
                  </div>
                  <div>
                      <h2 className="text-white font-extrabold text-lg tracking-wide drop-shadow-sm">Messages</h2>
                      {totalUnread > 0 ? (
                        <p className="text-accent text-[10px] uppercase tracking-wider font-bold">
                          {totalUnread} Unread 
                        </p>
                      ) : (
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          All caught up
                        </p>
                      )}
                  </div>
                </div>
              )}
              <button
                onClick={() => { setIsOpen(false); setActiveContact(null); }}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
              >
                <i className="fi fi-rr-cross-small text-xl flex items-center justify-center"></i>
              </button>
            </div>

            {/* ── Content Area ── */}
            {activeContact ? (
              /* ── Chat Messages View ── */
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 scrollbar-hide relative z-10">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${ROLE_COLORS[activeContact.role] || 'from-white/10 to-white/5'} border border-white/10 flex items-center justify-center text-white text-3xl font-black mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]`}>
                        {(activeContact.name || 'U')[0].toUpperCase()}
                      </div>
                      <p className="text-slate-300 text-sm font-medium mb-1">It's quiet here...</p>
                      <p className="text-slate-500 text-xs">Say hello to <strong className="text-white">{activeContact.name}</strong> to kick things off.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId === parseInt(userId);
                      const isLast = idx === messages.length - 1;
                      return (
                        <div key={m.messageId} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isLast ? 'animate-fade-in-up' : ''}`}>
                          <div className={`px-4 py-3 text-sm max-w-[85%] leading-relaxed shadow-lg backdrop-blur-md ${
                            isMe
                              ? 'bg-gradient-to-br from-accent to-accent/90 text-black rounded-2xl rounded-tr-sm shadow-accent/20 font-medium'
                              : 'bg-white/10 text-slate-200 rounded-2xl rounded-tl-sm border border-white/10'
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1.5 px-2 font-medium tracking-wide">{formatTime(m.createdAt)}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Message Input ── */}
                <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-2xl flex gap-3 relative z-10 w-full shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-accent hover:bg-accent/90 disabled:bg-white/5 disabled:text-slate-500 disabled:border overflow-hidden disabled:border-white/10 disabled:shadow-none text-black w-12 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(237,109,64,0.3)] hover:shadow-[0_0_25px_rgba(237,109,64,0.5)] flex items-center justify-center shrink-0 group/send m-0"
                  >
                    <i className="fi fi-rr-paper-plane group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform"></i>
                  </button>
                </form>
              </>
            ) : (
              /* ── Contact List View ── */
              <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1 relative z-10 scrollbar-hide">
                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 border-dashed flex items-center justify-center mb-6">
                       <i className="fi fi-rr-comments text-4xl text-slate-600"></i>
                    </div>
                    <p className="text-slate-300 text-sm font-bold tracking-wide">No active conversations</p>
                    <p className="text-slate-500 text-xs mt-2 max-w-[200px] leading-relaxed">Reach out to your captain or contact venue owners via their portals.</p>
                  </div>
                ) : (
                  <div>
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => openChat(contact)}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all duration-300 text-left group/contact border border-transparent hover:border-white/5 relative overflow-hidden"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_COLORS[contact.role] || 'from-white/10 to-white/5'} border border-white/10 flex items-center justify-center text-white font-black text-sm shadow-md group-hover/contact:shadow-xl transition-all duration-300 group-hover/contact:scale-105`}>
                            {(contact.name || 'U')[0].toUpperCase()}
                          </div>
                          {contact.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-black text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_var(--role-color)] border-2 border-[#121212] z-10 animate-pulse">
                              {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold tracking-wide truncate pr-2 transition-colors ${contact.unreadCount > 0 ? 'text-white' : 'text-slate-300 group-hover/contact:text-white'}`}>
                              {contact.name}
                            </span>
                            <span className={`text-[10px] flex-shrink-0 font-medium tracking-wide ${contact.unreadCount > 0 ? 'text-accent' : 'text-slate-500'}`}>
                              {formatTime(contact.lastMessageTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate max-w-[180px] ${contact.unreadCount > 0 ? 'text-slate-200 font-semibold' : 'text-slate-500'}`}>
                              {contact.lastMessage || 'Start a conversation'}
                            </p>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ml-2 ${ROLE_BADGE[contact.role] || 'bg-white/5 text-slate-400 border border-white/10'}`}>
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
