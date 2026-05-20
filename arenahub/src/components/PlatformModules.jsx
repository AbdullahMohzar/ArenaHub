import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const modules = [
  {
    id: 1,
    num: '01',
    title: 'VENUE\nDISCOVERY',
    desc: 'Find turfs by sport, location, surface type, and availability. Real-time listings with photos, pricing, and reviews.',
    color: '#5C939F',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9"/>
        <circle cx="32" cy="14" r="4" fill="currentColor" opacity="0.5"/>
        <circle cx="20" cy="32" r="7" fill="currentColor" opacity="0.7"/>
        <circle cx="38" cy="34" r="3" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 2,
    num: '02',
    title: 'SLOT\nBOOKING',
    desc: 'Reserve time slots in seconds. No phone calls, no back-and-forth. Instant confirmation with calendar sync.',
    color: '#ED6D40',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8"/>
        <line x1="8" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
        <line x1="20" y1="8" x2="20" y2="40" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 3,
    num: '03',
    title: 'CAPTAIN\nTOOLS',
    desc: 'Manage your squad, send invites, track attendance, and split costs. Everything a captain needs in one place.',
    color: '#FFFFFF',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="14" r="7" fill="currentColor" opacity="0.9"/>
        <circle cx="14" cy="34" r="5" fill="currentColor" opacity="0.5"/>
        <circle cx="34" cy="34" r="5" fill="currentColor" opacity="0.5"/>
        <line x1="24" y1="21" x2="14" y2="29" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <line x1="24" y1="21" x2="34" y2="29" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 4,
    num: '04',
    title: 'PLAYER\nNETWORK',
    desc: 'Join games, find teammates, build your profile. Connect with players who match your skill level and schedule.',
    color: '#3B82F6',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 8L28 20H40L30 28L34 40L24 32L14 40L18 28L8 20H20L24 8Z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
      </svg>
    ),
  },
  {
    id: 5,
    num: '05',
    title: 'OWNER\nDASHBOARD',
    desc: 'List turfs, set dynamic pricing, manage bookings, and track revenue. Full control over your sports business.',
    color: '#10B981',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8"/>
        <line x1="16" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="16" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <line x1="16" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 6,
    num: '06',
    title: 'MESSAGING &\nSCHEDULING',
    desc: 'Built-in chat, automated reminders, and shared calendars. Keep everyone aligned without leaving the app.',
    color: '#F59E0B',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8"/>
        <path d="M16 22L22 28L32 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      </svg>
    ),
  },
];

export default function PlatformModules() {
  const sectionRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current;
    if (!section || !cards) return;

    const ctx = gsap.context(() => {
      // Pin the left text while cards scroll on the right
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${cards.scrollHeight - window.innerHeight + 200}`,
        pin: '.pm-left',
        pinSpacing: false,
      });

      // Cards stagger entrance
      gsap.fromTo('.pm-card', 
        { y: 60, opacity: 0, rotateX: 10 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.15,
          scrollTrigger: {
            trigger: cards,
            start: 'top 80%',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Content */}
      <div className="relative z-10 flex max-w-[1400px] mx-auto">
        {/* Left sticky text */}
        <div className="pm-left w-[45%] lg:w-[40%] h-screen flex flex-col justify-center px-8 md:px-12 py-24">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-white/40 mb-6">
            Platform Modules
          </p>
          <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight uppercase mb-8">
            Venues.
            <br />
            Teams.
            <br />
            <em className="italic text-white/50 font-serif">Community.</em>
          </h2>
          <p className="text-[14px] leading-relaxed text-white/40 max-w-sm mb-10">
            In ArenaHub, every module is built to reduce friction and increase game time.
          </p>
          
          {/* Bracket button */}
          <a href="#contact" className="relative inline-flex items-center justify-center px-8 py-4 text-[11px] font-bold tracking-[0.24em] uppercase text-white/80 border border-white/15 rounded overflow-hidden transition-all duration-300 hover:bg-white/5 hover:border-white/30 w-fit group">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40 transition-all duration-300 group-hover:w-3 group-hover:h-3" />
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40 transition-all duration-300 group-hover:w-3 group-hover:h-3" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40 transition-all duration-300 group-hover:w-3 group-hover:h-3" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40 transition-all duration-300 group-hover:w-3 group-hover:h-3" />
            <span className="relative">Connect With Us</span>
          </a>

          <div className="mt-16 w-32 h-px bg-gradient-to-r from-white/20 to-transparent" />
        </div>

        {/* Right scrolling cards */}
        <div ref={cardsRef} className="w-[55%] lg:w-[60%] py-24 px-4 md:px-8 space-y-6">
          {modules.map((m) => (
            <div
              key={m.id}
              className="pm-card relative rounded-[24px] p-8 md:p-10 overflow-hidden transition-transform duration-500 hover:scale-[1.02]"
              style={{ backgroundColor: m.color }}
            >
              {/* Bracket corners */}
              <span className="absolute top-5 left-5 w-2 h-2 border-t border-l border-black/20" />
              <span className="absolute top-5 right-5 w-2 h-2 border-t border-r border-black/20" />
              <span className="absolute bottom-5 left-5 w-2 h-2 border-b border-l border-black/20" />
              <span className="absolute bottom-5 right-5 w-2 h-2 border-b border-r border-black/20" />

              <div className="flex flex-col h-full min-h-[320px]">
                {/* Top: Title + Icon */}
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight leading-tight text-[#0a0a12] whitespace-pre-line">
                    {m.title}
                  </h3>
                  <div className="text-[#0a0a12]/60">
                    {m.icon}
                  </div>
                </div>

                {/* Middle: Number */}
                <div className="mt-auto">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-[#0a0a12]/50 block mb-4">
                    {m.num}
                  </span>
                  <div className="w-full h-px bg-[#0a0a12]/15 mb-6" />
                  
                  {/* Bottom: Description */}
                  <p className="text-[14px] leading-relaxed text-[#0a0a12]/70 max-w-sm">
                    {m.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Spacer at bottom */}
          <div className="h-24" />
        </div>
      </div>
    </section>
  );
}