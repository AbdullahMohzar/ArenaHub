import React, { useEffect, useRef, useState } from 'react';

const DAMPING = 0.12;

export default function CursorFollower() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const rafRef = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia?.('(pointer: fine)').matches;
    setEnabled(!!isFinePointer);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const onEnter = () => setActive(true);
    const onLeave = () => setActive(false);

    const onOver = (e) => {
      const t = e.target;
      const isInteractive = !!t?.closest?.('a,button,[role="button"],input,select,textarea,label');
      if (isInteractive) document.documentElement.setAttribute('data-cursor-hover', 'true');
    };

    const onOut = (e) => {
      const t = e.target;
      const leavingInteractive = !!t?.closest?.('a,button,[role="button"],input,select,textarea,label');
      if (leavingInteractive) document.documentElement.setAttribute('data-cursor-hover', 'false');
    };

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * DAMPING;
      current.current.y += (target.current.y - current.current.y) * DAMPING;

      const x = current.current.x;
      const y = current.current.y;

      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      document.documentElement.style.setProperty('--cx', `${x}px`);
      document.documentElement.style.setProperty('--cy', `${y}px`);

      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseenter', onEnter);
    window.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(rafRef.current);
      document.documentElement.setAttribute('data-cursor-hover', 'false');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={`wqf-cursor ${active ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
      <div ref={ringRef} className="wqf-cursor-ring" />
      <div ref={dotRef} className="wqf-cursor-dot" />
    </div>
  );
}

