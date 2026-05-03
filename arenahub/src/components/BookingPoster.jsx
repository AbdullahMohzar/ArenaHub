import React from 'react';
import { motion } from 'framer-motion';

const BookingPoster = ({ booking, onCancel, onChat, onToggleVisibility, roleColor = 'emerald' }) => {
  // Parse date
  const dateObj = new Date(booking.BookingDate);
  const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate().toString().padStart(2, '0');

  const colorMap = {
    emerald: 'hover:bg-white text-zinc-300 hover:text-black border-white/40',
    indigo: 'hover:bg-white text-zinc-300 hover:text-black border-white/40',
    amber: 'hover:bg-white text-zinc-300 hover:text-black border-white/40',
    rose: 'hover:bg-zinc-500 text-zinc-400 hover:text-white border-zinc-500',
  };
  const badgeClasses = booking.Status === 'CANCELLED' ? colorMap.rose : (colorMap[roleColor] || colorMap.emerald);

  const isPast = new Date(`${booking.BookingDate}T${booking.StartTime}`) < new Date();
  const displayStatus = booking.Status === 'CANCELLED' ? 'CANCELLED' : (isPast ? 'COMPLETED' : booking.Status);

  return (
    <motion.div
      className={`relative group border-2 border-white/20 bg-arena-900 overflow-hidden mb-4 rounded-none transition-colors ${booking.Status === 'CANCELLED' ? 'opacity-50 grayscale' : 'hover:border-white/50'}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <div className="flex flex-col sm:flex-row min-h-[160px] relative z-10 bg-arena-900 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:-translate-y-[80px]">
        <div className="flex flex-col justify-center items-center p-6 border-b-2 sm:border-b-0 sm:border-r-2 border-white/20 w-full sm:w-48 shrink-0 bg-[url('/noise.png')]">
          <span className="text-xl font-bold tracking-widest text-slate-400 font-mono uppercase">{month}</span>
          <span className="text-6xl font-black font-space tracking-tighter text-white">{day}</span>
          <span className="text-xs text-slate-500 font-mono mt-2 uppercase">{booking.StartTime?.substring(0, 5)} - {booking.EndTime?.substring(0, 5)}</span>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-center relative">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('/noise.png')]" />
          <h2 className={`text-3xl font-black uppercase tracking-tight font-space ${booking.Status === 'CANCELLED' ? 'text-slate-500 line-through' : 'text-white'}`}>{booking.TurfName}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-3 py-1 border border-white/20 text-xs font-mono text-slate-300 uppercase bg-black/50">
              {booking.SportType || 'SPORT'}
            </span>
            {booking.Visibility === 'PUBLIC' && booking.Status !== 'CANCELLED' && (
              <span className="px-3 py-1 border border-white/30 text-xs font-mono uppercase text-zinc-200 bg-white/10">
                PUBLIC SQUAD
              </span>
            )}
          </div>
        </div>

        <div className={`flex flex-col justify-center p-6 border-t-2 sm:border-t-0 sm:border-l-2 border-white/20 w-full sm:w-56 shrink-0 transition-colors duration-300 ${badgeClasses.split(' ').filter(c => c.startsWith('hover:bg')).join(' ')} group-hover:text-black`}>
          <div className="text-center font-black text-2xl uppercase tracking-tighter font-space group-hover:text-black transition-colors duration-300">
            {displayStatus}
          </div>
          {booking.PaymentStatus === 'PAID' && booking.Status !== 'CANCELLED' && (
            <div className="text-center mt-2 text-xs font-mono tracking-widest opacity-70">
              PAID IN FULL
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-black border-t-2 border-white/20 flex items-center justify-between px-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-400 uppercase">
            Squad: <span className="text-white font-bold">{booking.CurrentPlayers}/{booking.MaxPlayers}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {displayStatus === 'CONFIRMED' && (
            <button
              onClick={() => onChat(booking.BookingID)}
              className="px-6 py-3 bg-white text-black font-black font-space uppercase text-sm hover:bg-zinc-200 transition-colors"
            >
              SQUAD CHAT
            </button>
          )}
          {displayStatus === 'CONFIRMED' && onToggleVisibility && (
            <button
              onClick={() => onToggleVisibility(booking.BookingID)}
              className={`px-6 py-3 border-2 text-white font-black font-space uppercase text-sm transition-colors ${booking.Visibility === 'PUBLIC' ? 'border-white/40 bg-white/10 hover:bg-white hover:text-black' : 'border-white/40 bg-white/10 hover:bg-white hover:text-black'}`}
            >
              MAKE {booking.Visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'}
            </button>
          )}
          {displayStatus === 'CONFIRMED' && (
            <button
              onClick={() => onCancel(booking.BookingID)}
              className="px-6 py-3 bg-zinc-700 text-white font-black font-space uppercase text-sm hover:bg-zinc-600 transition-colors"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const EmptyBookings = () => (
  <div className="relative border-2 border-white/10 p-12 overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
      <span className="text-[20rem] font-black font-space tracking-tighter">00</span>
    </div>
    <div className="relative z-10 text-center">
      <h3 className="text-2xl font-black text-white font-space uppercase tracking-widest mb-4">NO BATTLE SCHEDULED.</h3>
      <p className="text-slate-400 font-mono mb-8">JOIN A GAME AND PROVE YOUR WORTH.</p>
    </div>
  </div>
);

export default BookingPoster;
