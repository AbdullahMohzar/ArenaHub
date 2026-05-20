import React from 'react';

const GameCard = ({ game, onJoin, onLeave, onChat, isJoined }) => {
  return (
    <div
      className="glass rounded-none p-5 border-2 border-white/5 hover:border-white/30 transition-all group relative overflow-hidden bg-arena-900"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '260px 260px' }}
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('/noise.png')]" />
      
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-black font-space tracking-tight text-white uppercase group-hover:text-zinc-200 transition-colors">{game.TurfName}</h3>
          <p className="text-sm font-mono text-slate-400 uppercase mt-1">HOST: <span className="text-white">{game.HostName}</span></p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black font-space tracking-tighter text-zinc-200">RS.{game.PricePerHour}/HR</div>
          <div className="text-xs font-mono text-slate-500 uppercase mt-1 border border-white/10 px-2 py-0.5 inline-block">{game.SportType}</div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-4 mb-4 bg-black/50 border-2 border-white/10 p-3">
        <div>
          <div className="text-xs font-mono text-slate-500 uppercase">DATE & TIME</div>
          <div className="text-sm font-bold text-white">📅 {game.BookingDate}</div>
          <div className="text-sm font-bold text-white">🕐 {game.StartTime?.substring(0,5)} — {game.EndTime?.substring(0,5)}</div>
        </div>
        <div>
          <div className="text-xs font-mono text-slate-500 uppercase">SQUAD</div>
          <div className="text-sm font-bold text-white">👤 {game.CurrentPlayers} / {game.MaxPlayers} JOINED</div>
          <div className="w-full h-1.5 bg-white/10 rounded-none mt-1.5 overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${(game.CurrentPlayers / game.MaxPlayers) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3 mt-4">
        {!isJoined ? (
          <>
            <button onClick={() => onJoin(game.BookingID)}
              className="flex-1 px-5 py-3 border-2 border-white/40 bg-white/10 text-zinc-200 text-sm font-black font-space uppercase hover:bg-white hover:text-black transition-colors tracking-widest">
              JOIN SQUAD
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onChat(game.BookingID, game.HostUserID, game.HostName)}
              className="flex-1 px-5 py-3 border-2 border-white/40 bg-white/10 text-zinc-200 text-sm font-black font-space uppercase hover:bg-white hover:border-white hover:text-black transition-colors tracking-widest">
              SQUAD CHAT
            </button>
            <button onClick={() => onLeave(game.BookingID)}
              className="px-5 py-3 border-2 border-white/30 bg-white/5 text-zinc-400 text-sm font-black font-space uppercase hover:bg-zinc-700 hover:border-zinc-600 hover:text-white transition-colors tracking-widest">
              LEAVE GAME
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GameCard;
