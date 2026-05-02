import React, { useRef, useState } from 'react';
import Marquee from 'react-fast-marquee';
import { motion, AnimatePresence } from 'framer-motion';

// ── MAGNETIC BUTTON ──────────────────────────────────────────────────────────
export const MagneticButton = ({ children, onClick, className = '', disabled = false }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 }); // Attraction strength
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onClick={onClick}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={`brutal-btn px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </motion.button>
  );
};

// ── KINETIC CARD ─────────────────────────────────────────────────────────────
export const KineticCard = ({ children, className = '', index = 0, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`brutal-card p-6 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// ── KINETIC MARQUEE ──────────────────────────────────────────────────────────
export const KineticMarquee = ({ text, speed = 50, direction = "left", className = '' }) => {
  return (
    <div className={`border-y-2 border-zinc-800 bg-zinc-900 overflow-hidden py-2 ${className}`}>
      <Marquee speed={speed} direction={direction} gradient={false} pauseOnHover>
        <span className="text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-zinc-800 px-4 whitespace-nowrap brutal-text-stroke">
          {text} • {text} • {text} • {text} • 
        </span>
      </Marquee>
    </div>
  );
};

// Add explicit CSS for the text-stroke effect inside the marquee
const styles = `
  .brutal-text-stroke {
    -webkit-text-stroke: 1px var(--role-color);
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
