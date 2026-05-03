import React from 'react';
import { motion } from 'framer-motion';

const FootballIcon = ({ size = 28, className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <ellipse cx="32" cy="32" rx="24" ry="16" fill="currentColor" />
    <path d="M16 32c6-7 26-7 32 0-6 7-26 7-32 0Z" fill="#0b0f0d" />
    <path d="M24 28h16v8H24z" fill="#f8fafc" />
    <path d="M26 28v8M30 28v8M34 28v8M38 28v8" stroke="#0b0f0d" strokeWidth="1.8" />
  </svg>
);

const FootballSpinner = ({
  loading = false,
  label = 'Loading match feed...',
  size = 28,
  className = ''
}) => {
  if (!loading) return null;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        animate={{ rotate: 360, y: [0, -2, 0] }}
        transition={{
          rotate: { repeat: Infinity, ease: 'linear', duration: 0.52 },
          y: { repeat: Infinity, ease: 'easeInOut', duration: 0.38 }
        }}
        className="inline-flex items-center justify-center border-2 border-emerald-400 bg-black p-2"
      >
        <FootballIcon size={size} className="text-emerald-400" />
      </motion.div>
      <p className="font-space text-xs font-black uppercase tracking-[0.2em] text-slate-200">{label}</p>
    </div>
  );
};

export default FootballSpinner;
