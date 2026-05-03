import React, { useEffect, useRef, useMemo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../home.css';
import EthosSection from '../components/EthosSection';
import FeaturesCarousel from '../components/FeaturesCarousel';

import PlatformModules from '../components/PlatformModules';

const ThreeVortex = lazy(() => import('../components/ThreeVortex'));

gsap.registerPlugin(ScrollTrigger);

/* ── Static data ────────────────────────────────── */
const FEATURES = [
  {
    label: 'Browse Venues',
    body: 'Filter turfs by sport, city, surface, and price—find the right pitch in seconds.',
    num: '01',
  },
  {
    label: 'Book Slots',
    body: 'Reserve a time in minutes—no back-and-forth, no ambiguity, no phone calls.',
    num: '02',
  },
  {
    label: 'Join Games',
    body: 'Players stay in the loop while captains bring the right squad together.',
    num: '03',
  },
  {
    label: 'Manage Venues',
    body: 'Owners list turfs, set dynamic pricing, and handle bookings at scale.',
    num: '04',
  },
];

const MODULES = [
  'Venue discovery',
  'Slot booking',
  'Captain tools',
  'Player onboarding',
  'Owner dashboard',
  'Messaging',
  'Disputes & admin',
  'Analytics',
];

const MARQUEE_TEXT = 'SPORT · BOOK · PLAY · MANAGE · CONNECT · COMPETE · ARENA · TURF · FIELD · ';

/* ── Corner-bracket button (WQF style) ─────────── */
const BracketBtn = ({ to, children, solid = false, id }) => (
  <Link
    id={id}
    to={to}
    className={`ah-bracket-btn ${solid ? 'ah-bracket-solid' : 'ah-bracket-ghost'}`}
  >
    <span className="ah-bracket-tl" />
    <span className="ah-bracket-tr" />
    <span className="ah-bracket-bl" />
    <span className="ah-bracket-br" />
    <span className="ah-bracket-label">{children}</span>
  </Link>
);

/* ── Home component ─────────────────────────────── */
const Home = () => {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const canvasRef = useRef(null);

  // Keep page in dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-page', 'home');
    document.documentElement.setAttribute('data-home-theme', 'dark');
    return () => {
      document.documentElement.removeAttribute('data-page');
      document.documentElement.removeAttribute('data-home-theme');
    };
  }, []);

  // Hero passed detection (for Navbar pill)
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const passed = !entry.isIntersecting;
        document.documentElement.setAttribute('data-home-hero-passed', passed ? 'true' : 'false');
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // GSAP scroll animations
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let ctx = null;
    let cancelled = false;
    // Wait a frame so DOM is fully rendered
    const timer = setTimeout(() => {
      if (cancelled) return;
      ctx = gsap.context(() => {

        /* Hero lines stagger-in */
        gsap.fromTo('.ah-hero-line', { yPercent: 110, opacity: 0 }, {
          yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.2,
        });
        gsap.fromTo('.ah-hero-sub', { y: 22, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.65,
        });
        gsap.fromTo('.ah-hero-cta', { y: 16, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.85,
        });

        /* ── Dark → Light body transition on scroll ── */
        const ethosHeader = document.querySelector('.ah-ethos-wqf');
        if (ethosHeader) {
          gsap.to('html[data-page="home"] body', {
            backgroundColor: '#d4d4d4',
            color: '#0a0a12',
            ease: 'none',
            scrollTrigger: {
              trigger: ethosHeader,
              start: 'top 90%',
              end: 'top 20%',
              scrub: 1.5,
            },
          });

          /* Ethos section slides up with rounded top corners */
          gsap.fromTo(ethosHeader,
            { borderRadius: '32px 32px 0 0', y: 60 },
            {
              borderRadius: '0px 0px 0 0',
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: ethosHeader,
                start: 'top 95%',
                end: 'top 40%',
                scrub: 1.2,
              },
            }
          );
        }

                /* ── Ethos → Features light sheet transition ── */
        const featuresSection = document.querySelector('#features');
        if (featuresSection) {
          gsap.fromTo(featuresSection, 
            { borderRadius: '32px 32px 0 0', y: 80 }, 
            { 
              borderRadius: '0px 0px 0 0', 
              y: 0, 
              ease: 'none',
              scrollTrigger: {
                trigger: featuresSection,
                start: 'top 95%',
                end: 'top 40%',
                scrub: 1.2,
              },
            }
          );
        }
        /* Section titles slide-up */
        gsap.utils.toArray('.ah-section-title').forEach((el) => {
          gsap.fromTo(el, { y: 50, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 82%' },
          });
        });

        /* Features cards stagger */
        const featGrid = document.querySelector('.ah-features-grid');
        if (featGrid) {
          gsap.fromTo(featGrid.querySelectorAll('.ah-card'), { y: 60, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: featGrid, start: 'top 78%' },
          });
        }

       
        
                /* ── Features cards entrance ── */
        const featureItems = document.querySelectorAll('.ah-feature-item');
        if (featureItems.length) {
          gsap.fromTo(featureItems, 
            { y: 80, opacity: 0, rotateX: 15 }, 
            {
              y: 0, 
              opacity: 1, 
              rotateX: 0,
              duration: 0.9, 
              ease: 'power3.out', 
              stagger: 0.12,
              scrollTrigger: { 
                trigger: '.ah-features-cards', 
                start: 'top 85%',
              },
            }
          );
        }

        /* ── Features header entrance ── */
        gsap.fromTo('.ah-features-header', 
          { y: 50, opacity: 0 }, 
          {
            y: 0, 
            opacity: 1, 
            duration: 1, 
            ease: 'expo.out',
            scrollTrigger: { 
              trigger: '.ah-features-header', 
              start: 'top 85%',
            },
          }
        );

        /* Stats counter */
        gsap.utils.toArray('.ah-stat-num').forEach((el) => {
          const target = parseFloat(el.dataset.target);
          const isFloat = el.dataset.float === '1';
          gsap.fromTo({ v: 0 }, { v: target }, {
            duration: 2, ease: 'power2.out',
            onUpdate() { el.textContent = isFloat ? this.targets()[0].v.toFixed(1) : Math.round(this.targets()[0].v); },
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        });

        /* CTA section reveal */
        gsap.fromTo('.ah-cta-content', { y: 40, opacity: 0 }, {
          y: 0, opacity: 1, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: '.ah-cta-content', start: 'top 80%' },
        });

      }, root);
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctx?.revert();
      // Reset body styles when leaving home
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return (
    <div ref={rootRef} className="ah-root">

      {/* ════════ HERO ════════ */}
      <section ref={heroRef} className="ah-hero">
        {/* Background grid */}
        <div className="ah-bg-grid" aria-hidden="true" />
        {/* Blue edge glow */}
        <div className="ah-edge-glow" aria-hidden="true" />

        {/* Full-bleed Canvas */}
        <div className="ah-hero-canvas-bg" ref={canvasRef} aria-hidden="true">
          <Suspense fallback={<div className="ah-canvas-fallback" />}>
            <ThreeVortex />
          </Suspense>
        </div>

        {/* Overlay Content */}
        <div className="ah-hero-content">
          <h1 className="ah-h1-hero">
            <div className="ah-hero-top-left">
              <span className="ah-hero-line-wrap"><span className="ah-hero-line">FORGING TEAMS</span></span>
              <span className="ah-hero-line-wrap"><span className="ah-hero-line">THAT</span></span>
            </div>
            <div className="ah-hero-bottom-right">
              <span className="ah-hero-line-wrap"><span className="ah-hero-line">PULL THE</span></span>
              <span className="ah-hero-line-wrap"><span className="ah-hero-line">FUTURE FORWARD</span></span>
            </div>
          </h1>

          <div className="ah-hero-footer">
            <div className="ah-hero-cta">
              <BracketBtn to="/signup" id="home-cta-join">CONTACT US</BracketBtn>
            </div>
            <div className="ah-hero-sub-wrap">
              <p className="ah-hero-sub">
                ARENAHUB IS A PLATFORM THAT EMPOWERS PLAYERS AND CAPTAINS
                TO PULL THE FUTURE FORWARD. FAST BOOKING. CONNECTIONS.
                MANAGEMENT. WE DELIVER MORE THAN VENUES—WE CREATE THE INFRASTRUCTURE FOR PLAY.
              </p>
              <div className="ah-hero-logo-mark">
                <svg width="36" height="36" viewBox="0 0 26 26" fill="none">
                  <rect x="1" y="1" width="24" height="24" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
                  <path d="M6 19L13 7L20 19" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
                  <path d="M8.5 14.5H17.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee strip */}
        <div className="ah-marquee" aria-hidden="true">
          <div className="ah-marquee-track">
            <span>{MARQUEE_TEXT.repeat(6)}</span>
          </div>
        </div>
      </section>

      {/* ════════ STATS ════════ */}
      <section className="ah-stats-section">
        <div className="ah-container">
          <div className="ah-stats-grid">
            {[
              { label: 'Venues listed', value: 1200, suffix: '+', float: 0 },
              { label: 'Bookings made', value: 48, suffix: 'K+', float: 0 },
              { label: 'Avg rating', value: 4.8, suffix: '★', float: 1 },
              { label: 'Cities covered', value: 32, suffix: '+', float: 0 },
            ].map((s) => (
              <div className="ah-stat" key={s.label}>
                <p className="ah-stat-value">
                  <span className="ah-stat-num" data-target={s.value} data-float={s.float}>0</span>
                  <span className="ah-stat-suffix">{s.suffix}</span>
                </p>
                <p className="ah-stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ ETHOS — WQF Accordion Strips ════════ */}
      <EthosSection />

             {/* ════════ FEATURES — Draggable Card Carousel ════════ */}
      <FeaturesCarousel />

            {/* ════════ PLATFORM MODULES — Sticky Left + Scrolling Cards ════════ */}
      <PlatformModules />

      {/* ════════ CTA / CONTACT ════════ */}
      <section id="contact" className="ah-cta-section">
        <div className="ah-cta-glow" aria-hidden="true" />
        <div className="ah-container">
          <div className="ah-cta-content">
            <p className="ah-eyebrow">Get Started</p>
            <h2 className="ah-h2 ah-cta-h2">
              Own what's next.<br />
              <span className="ah-cta-italic">Step onto the pitch.</span>
            </h2>
            <p className="ah-cta-sub">
              Start as a player, captain, or owner. Create an account and explore venues—
              or list your turf and start accepting bookings today.
            </p>
            <div className="ah-cta-btns">
              <BracketBtn to="/signup" solid id="cta-join">JOIN US</BracketBtn>
              <BracketBtn to="/login" id="cta-login">LOG IN</BracketBtn>
            </div>

            <div className="ah-cta-links">
              <Link className="ah-footer-link" to="/#why">Why ArenaHub</Link>
              <span className="ah-footer-divider">·</span>
              <Link className="ah-footer-link" to="/#features">Features</Link>
              <span className="ah-footer-divider">·</span>
              <Link className="ah-footer-link" to="/signup">Create account</Link>
              <span className="ah-footer-divider">·</span>
              <Link className="ah-footer-link" to="/login">Log in</Link>
            </div>

            <p className="ah-legal">
              © {new Date().getFullYear()} ArenaHub — Sports venue marketplace.
              Design inspired by WorldQuant Foundry aesthetic.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;