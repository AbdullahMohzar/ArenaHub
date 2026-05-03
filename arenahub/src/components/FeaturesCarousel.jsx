import { useRef, useState, useEffect, useCallback } from 'react';

const features = [
  {
    id: 1,
    num: '01',
    title: 'BROWSE\nVENUES',
    desc: 'Filter turfs by sport, city, surface, and price—find the right pitch in seconds.',
    color: '#0a0a0a',
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="15" cy="15" r="6" fill="currentColor" opacity="0.9"/>
        <circle cx="38" cy="18" r="5" fill="currentColor" opacity="0.5"/>
        <circle cx="25" cy="38" r="8" fill="currentColor" opacity="0.7"/>
        <circle cx="45" cy="42" r="4" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 2,
    num: '02',
    title: 'BOOK\nSLOTS',
    desc: 'Reserve a time in minutes—no back-and-forth, no ambiguity, no phone calls.',
    color: '#0a0a0a',
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect x="10" y="10" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8"/>
        <line x1="10" y1="26" x2="50" y2="26" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
        <line x1="26" y1="10" x2="26" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 3,
    num: '03',
    title: 'JOIN\nGAMES',
    desc: 'Players stay in the loop while captains bring the right squad together.',
    color: '#0a0a0a',
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="18" r="8" fill="currentColor" opacity="0.9"/>
        <circle cx="18" cy="42" r="6" fill="currentColor" opacity="0.5"/>
        <circle cx="42" cy="42" r="6" fill="currentColor" opacity="0.5"/>
        <line x1="30" y1="26" x2="18" y2="36" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <line x1="30" y1="26" x2="42" y2="36" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 4,
    num: '04',
    title: 'MANAGE\nVENUES',
    desc: 'Owners list turfs, set dynamic pricing, and handle bookings at scale.',
    color: '#0a0a0a',
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect x="14" y="6" width="32" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8"/>
        <line x1="20" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="20" y1="28" x2="36" y2="28" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <line x1="20" y1="38" x2="32" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
  },
];

export default function FeaturesCarousel() {
  const trackRef = useRef(null);
  const dragPillRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isOverTrack, setIsOverTrack] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const rafId = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const activePillRef = useRef(false);

  const stopPillRaf = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const tickPill = useCallback(() => {
    if (!activePillRef.current) {
      rafId.current = null;
      return;
    }
    const pill = dragPillRef.current;
    if (!pill) {
      rafId.current = null;
      return;
    }
    const { x, y } = mousePosRef.current;
    const currentLeft = parseFloat(pill.style.left) || 0;
    const currentTop = parseFloat(pill.style.top) || 0;
    const targetX = x - 28;
    const targetY = y - 14;
    pill.style.left = `${currentLeft + (targetX - currentLeft) * 0.15}px`;
    pill.style.top = `${currentTop + (targetY - currentTop) * 0.15}px`;
    rafId.current = requestAnimationFrame(tickPill);
  }, []);

  useEffect(() => {
    activePillRef.current = isOverTrack && !isDragging;
    if (activePillRef.current && rafId.current == null) {
      rafId.current = requestAnimationFrame(tickPill);
    }
    if (!activePillRef.current) stopPillRaf();
    return stopPillRaf;
  }, [isOverTrack, isDragging, tickPill, stopPillRaf]);

  const handleMouseMove = useCallback((e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isDragging && trackRef.current) {
      e.preventDefault();
      const x = e.pageX - trackRef.current.offsetLeft;
      const walk = (x - startX) * 1.2;
      const newScroll = scrollLeft - walk;
      trackRef.current.scrollLeft = newScroll;
      
      // Calculate velocity for momentum
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        setVelocity((x - lastX.current) / dt);
      }
      lastX.current = x;
      lastTime.current = now;
    }
  }, [isDragging, startX, scrollLeft]);

  const handleMouseDown = (e) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
    lastX.current = e.pageX - trackRef.current.offsetLeft;
    lastTime.current = Date.now();
    setVelocity(0);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Momentum scroll
    if (trackRef.current && Math.abs(velocity) > 0.5) {
      const momentum = velocity * 100;
      trackRef.current.scrollTo({
        left: trackRef.current.scrollLeft - momentum,
        behavior: 'smooth',
      });
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsOverTrack(false);
    setHoveredCard(null);
  };

  const handleMouseEnterTrack = (e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    setIsOverTrack(true);
  };

  // Touch support
  const handleTouchStart = (e) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setStartX(touch.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    const touch = e.touches[0];
    const x = touch.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX) * 1.2;
    trackRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Only listen while hovering the track or dragging — avoids work on every mousemove sitewide
  useEffect(() => {
    if (!isOverTrack && !isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOverTrack, isDragging, handleMouseMove]);

  return (
        <section id="features" className="relative bg-white text-[#0a0a12] overflow-hidden" style={{ borderRadius: '32px 32px 0 0', marginTop: '-32px', zIndex: 20, boxShadow: '0 -20px 60px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div className="px-8 md:px-12 pt-24 md:pt-32 pb-12 md:pb-16 max-w-[1400px] mx-auto">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#0a0a12]/50 mb-5">
          Our Focus
        </p>
        <h2 className="font-sans text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight uppercase text-[#0a0a12]">
          Better booking.
          <br />
          <em className="italic text-[#0a0a12]/50 font-serif">Better games.</em>
        </h2>
        <p className="text-[15px] leading-relaxed text-[#0a0a12]/60 mt-6 max-w-lg">
          Every feature exists to cut friction between you and the pitch.
        </p>
      </div>

      {/* Drag Pill Cursor */}
      <div
        ref={dragPillRef}
        className={`fixed pointer-events-none z-[9999] transition-opacity duration-300 ${
          isOverTrack && !isDragging ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: 0, top: 0 }}
      >
        <span className="inline-flex items-center justify-center px-4 py-2 bg-[#0a0a0a] text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-full">
          DRAG
        </span>
      </div>

      {/* Carousel Track */}
      <div
        className="relative flex gap-0 overflow-x-auto overflow-y-hidden px-8 md:px-12 pb-16 scrollbar-hide select-none"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnterTrack}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          scrollSnapType: 'x mandatory',
          cursor: isDragging ? 'grabbing' : 'none',
        }}
      >
        {features.map((f) => {
          const isHovered = hoveredCard === f.id;
          const isSibling = hoveredCard !== null && hoveredCard !== f.id;

          return (
            <div
              key={f.id}
              className="group relative flex-shrink-0 w-[340px] md:w-[400px] h-[520px] md:h-[580px] mx-3 first:ml-0 last:mr-12 rounded-[24px] overflow-hidden scroll-snap-align-start transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                backgroundColor: isHovered ? f.color : '#e8e8e8',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={() => setHoveredCard(f.id)}
              onMouseLeave={() => !isDragging && setHoveredCard(null)}
            >
              {/* Sibling fade overlay */}
              {isSibling && (
                <div className="absolute inset-0 bg-[#d4d4d4]/40 z-10 pointer-events-none transition-opacity duration-500" />
              )}

              {/* Bracket corners */}
              <span 
                className="absolute top-6 left-6 w-3 h-3 border-t border-l transition-all duration-500 z-20"
                style={{ 
                  borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,18,0.2)',
                  width: isHovered ? 16 : 12,
                  height: isHovered ? 16 : 12,
                }}
              />
              <span 
                className="absolute top-6 right-6 w-3 h-3 border-t border-r transition-all duration-500 z-20"
                style={{ 
                  borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,18,0.2)',
                  width: isHovered ? 16 : 12,
                  height: isHovered ? 16 : 12,
                }}
              />
              <span 
                className="absolute bottom-6 left-6 w-3 h-3 border-b border-l transition-all duration-500 z-20"
                style={{ 
                  borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,18,0.2)',
                  width: isHovered ? 16 : 12,
                  height: isHovered ? 16 : 12,
                }}
              />
              <span 
                className="absolute bottom-6 right-6 w-3 h-3 border-b border-r transition-all duration-500 z-20"
                style={{ 
                  borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,18,0.2)',
                  width: isHovered ? 16 : 12,
                  height: isHovered ? 16 : 12,
                }}
              />

              {/* Card Content */}
              <div className="relative z-10 flex flex-col items-center h-full p-10 md:p-12 text-center">
                {/* Number */}
                <span 
                  className="text-[11px] font-bold tracking-[0.2em] transition-colors duration-500 mb-6"
                  style={{ color: isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,18,0.35)' }}
                >
                  {f.num}
                </span>

                {/* Title */}
                <h3 
                  className="font-sans text-xl md:text-2xl font-bold uppercase tracking-tight leading-tight whitespace-pre-line transition-colors duration-500 mb-10"
                  style={{ color: isHovered ? '#fff' : '#0a0a12' }}
                >
                  {f.title}
                </h3>

                {/* Icon */}
                <div 
                  className="flex-1 flex items-center justify-center transition-all duration-500"
                  style={{ 
                    color: isHovered ? '#fff' : '#0a0a12',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    opacity: isHovered ? 1 : 0.7,
                  }}
                >
                  {f.icon}
                </div>

                {/* Description */}
                <p 
                  className="text-[13px] leading-relaxed max-w-[260px] mb-10 transition-colors duration-500"
                  style={{ color: isHovered ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,18,0.5)' }}
                >
                  {f.desc}
                </p>

                {/* CTA */}
                <div className="mt-auto">
                  <span 
                    className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase px-7 py-3 rounded transition-all duration-500"
                    style={{ 
                      color: isHovered ? '#fff' : 'rgba(10,10,18,0.4)',
                      border: `1px solid ${isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(10,10,18,0.12)'}`,
                      backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    Explore
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}