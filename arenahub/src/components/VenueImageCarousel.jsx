import React, { useState, useEffect } from 'react';

export const CAROUSEL_INTERVAL_MS = 4500;

/** Unique absolute image URLs for a turf (primary ImageURL + gallery `images[]`). */
export function collectTurfImageUrls(t, apiBase) {
  if (!t || !apiBase) return [];
  const seen = new Set();
  const out = [];
  const add = (path) => {
    if (!path || typeof path !== 'string') return;
    const norm = path.trim();
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push(norm.startsWith('http') ? norm : `${apiBase}${norm}`);
  };
  add(t.ImageURL);
  if (Array.isArray(t.images)) t.images.forEach(add);
  return out;
}

const emptyByVariant = {
  owner: (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-arena-950">
      <span className="text-4xl mb-2">🏟️</span>
      <span className="text-indigo-400/50 text-sm font-semibold tracking-widest uppercase">ArenaHub Turf</span>
    </div>
  ),
  player: (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/40 to-arena-800">
      <span className="text-4xl mb-2 opacity-40">🏟️</span>
    </div>
  ),
  captain: (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900 to-arena-950">
      <span className="text-4xl mb-2">🏟️</span>
      <span className="text-amber-400/50 text-sm font-semibold tracking-widest uppercase">ArenaHub Turf</span>
    </div>
  ),
};

/**
 * Card header: empty placeholder, single image, or auto-sliding strip when multiple.
 * @param {'owner'|'player'|'captain'} emptyVariant - placeholder when there are no URLs
 */
export function VenueImageCarousel({ urls, alt, emptyVariant = 'owner' }) {
  const [idx, setIdx] = useState(0);
  const n = urls.length;
  const urlsKey = urls.join('|');

  useEffect(() => {
    setIdx(0);
  }, [urlsKey]);

  useEffect(() => {
    if (n <= 1) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % n);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) {
    return emptyByVariant[emptyVariant] || emptyByVariant.owner;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div
        className="flex h-full w-full transition-transform duration-[850ms] ease-in-out motion-reduce:transition-none"
        style={{ transform: n > 1 ? `translateX(-${idx * 100}%)` : undefined }}
      >
        {urls.map((src, i) => (
          <div key={`${src}-${i}`} className="h-full w-full min-w-full shrink-0">
            <img src={src} alt={alt} className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      {n > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-2">
          {urls.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'w-1.5 bg-white/45'}`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </div>
  );
}
