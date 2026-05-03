import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ScoreboardNumber = ({
  value,
  formatter,
  className = '',
  padTo = 0
}) => {
  const rawText = formatter ? formatter(value) : String(value ?? 0);
  const displayText = padTo > 0 ? rawText.padStart(padTo, '0') : rawText;

  return (
    <span className={`inline-flex overflow-hidden border-2 border-white/20 bg-black/70 px-2 py-1 font-space font-black tracking-wider ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={displayText}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block tabular-nums"
        >
          {displayText}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default ScoreboardNumber;
