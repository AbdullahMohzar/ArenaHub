import React from 'react';
import { motion } from 'framer-motion';
import { KineticMarquee } from './KineticPrimitive';

const DashboardHero = ({ title, subtitle, stats = [] }) => {
  return (
    <div className="mb-12 relative w-full border-b-2 border-zinc-800 pb-8">
      {/* Clip-path unmasking animation */}
      <div className="overflow-hidden mb-4">
        <motion.h1 
          className="text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter text-white animate-pulse-heartbeat"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h1>
      </div>

      <motion.p 
        className="text-xl md:text-2xl text-zinc-400 font-bold max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {subtitle}
      </motion.p>

      {/* Kinetic Marquee for active status updates */}
      <div className="mt-8">
        <KineticMarquee text="ARENAHUB LIVE • SQUAD STATUS ACTIVE • NOISE TEXTURE ENABLED" speed={80} />
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="border-2 border-zinc-800 p-4 bg-zinc-900"
            >
              <p className="text-xs text-zinc-500 font-bold uppercase">{stat.label}</p>
              <p className="text-3xl font-black text-[var(--role-color)]">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardHero;
