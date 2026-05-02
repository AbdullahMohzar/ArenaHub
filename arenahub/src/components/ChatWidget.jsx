import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8080';

const ChatWidget = ({ currentUserId, bookingId = null, receiverId = null, onClose, title = "Chat" }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      let url = `${API}/api/messages?`;
      if (bookingId) url += `bookingId=${bookingId}`;
      else if (receiverId) url += `userId1=${currentUserId}&userId2=${receiverId}`;
      
      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [bookingId, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          senderId: parseInt(currentUserId),
          content: newMessage,
          bookingId: bookingId ? parseInt(bookingId) : null,
          receiverId: receiverId ? parseInt(receiverId) : null
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-arena-950 border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
      <div className="p-4 bg-indigo-500/20 border-b border-indigo-500/30 flex justify-between items-center backdrop-blur-md">
        <h3 className="text-white font-bold">{title}</h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px] bg-black/20 space-y-4">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center text-sm mt-10">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(m => {
            const isMe = m.SenderID === parseInt(currentUserId);
            return (
              <div key={m.MessageID} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-300">{isMe ? 'You' : m.SenderName}</span>
                  <span className="text-[10px] text-slate-500">{m.SenderRole}</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${isMe ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-white/10 text-slate-200 rounded-bl-sm'}`}>
                  {m.Content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-arena-950 flex gap-2">
        <input 
          type="text" 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          placeholder="Type a message..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white p-2 rounded-xl transition-colors">
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
