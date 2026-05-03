import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagneticButton } from './KineticPrimitive';
import { resolveUploadImageUrl } from './VenueImageCarousel';

const API = 'http://localhost:8080';

export const ReviewMarquee = ({ reviews }) => {
  if (!reviews || reviews.length === 0) return null;

  const strip = reviews.map((r, idx) => (
    <div key={idx} className="flex items-center gap-4 mx-8 shrink-0">
      <span className="text-black font-black text-2xl uppercase">&ldquo;{r.ReviewText}&rdquo;</span>
      <span className="text-black/60 font-bold text-sm">— {r.UserName} ({r.Rating}/5)</span>
      <span className="text-black/20 text-3xl font-black">/</span>
    </div>
  ));

  return (
    <div className="border-t-2 border-zinc-800 bg-[var(--role-color)] mt-8 py-4 relative group overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
      <div className="kinetic-marquee-track">
        <div className="flex w-max">{strip}</div>
        <div className="flex w-max">{strip}</div>
      </div>
    </div>
  );
};

const TurfGallery = ({ turf, images, reviews, onBook }) => {
  const [activeImage, setActiveImage] = useState(0);

  const mainImage = images.length > 0 ? images[activeImage] : turf.ImageURL;
  const thumbnails = images.length > 0 ? images : [turf.ImageURL];
  const mainImageSrc = resolveUploadImageUrl(mainImage, API, 'turfs');
  const thumbnailSrcs = thumbnails.map((img) => resolveUploadImageUrl(img, API, 'turfs'));

  return (
    <div className="w-full bg-zinc-950 border-2 border-zinc-800">
      {/* 70/30 Split Layout */}
      <div className="flex flex-col lg:flex-row min-h-[60vh]">
        
        {/* 70% Left: Massive Gallery */}
        <div className="w-full lg:w-[70%] relative overflow-hidden border-b-2 lg:border-b-0 lg:border-r-2 border-zinc-800 bg-zinc-900 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeImage}
              src={mainImageSrc}
              alt="Turf"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full object-cover grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-700"
            />
          </AnimatePresence>

          {/* Brutalist Mix-Blend Overlay */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none mix-blend-difference">
            <h2 className="text-[clamp(3rem,8vw,8rem)] font-black leading-none text-white uppercase break-words w-full">
              {turf.Name}
            </h2>
            <div className="text-white">
              <p className="text-4xl font-bold">Rs. {turf.PricePerHour} / HR</p>
              <p className="text-xl uppercase">{turf.SportType}</p>
            </div>
          </div>
        </div>

        {/* 30% Right: Controls & Info */}
        <div className="w-full lg:w-[30%] bg-zinc-950 flex flex-col">
          <div className="p-6 flex-1 flex flex-col gap-6">
            <h3 className="text-2xl font-black text-white uppercase border-b-2 border-zinc-800 pb-2">Gallery</h3>
            
            <div className="grid grid-cols-2 gap-2">
              {thumbnailSrcs.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square border-2 transition-all ${activeImage === idx ? 'border-[var(--role-color)] scale-95' : 'border-zinc-800 hover:border-zinc-600'}`}
                >
                  <img src={img} className="w-full h-full object-cover grayscale hover:grayscale-0" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <MagneticButton onClick={onBook} className="w-full text-xl py-6">
                Deploy Squad
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      <ReviewMarquee reviews={reviews} />
    </div>
  );
};

export default TurfGallery;
