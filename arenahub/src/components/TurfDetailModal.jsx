import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080';

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => interactive && onRate(star)}
        className={`text-lg transition-transform ${interactive ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${star <= rating ? 'text-amber-400' : 'text-slate-600'}`}
      >★</button>
    ))}
  </div>
);

const TurfDetailModal = ({ turf, onClose, onBookNow, userId, token }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  const [reviewForm, setReviewForm] = useState({ rating: 0, reviewText: '', imageFiles: [] });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Combine primary image and gallery
  const galleryImages = [];
  if (turf.images && turf.images.length > 0) {
    galleryImages.push(...turf.images);
  } else if (turf.ImageURL) {
    galleryImages.push(turf.ImageURL);
  }

  useEffect(() => {
    fetchReviews();
  }, [turf.TurfID]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API}/api/reviews?turfId=${turf.TurfID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewForm.rating < 1) return alert("Please select a rating.");

    try {
      let res;
      if (reviewForm.imageFiles && reviewForm.imageFiles.length > 0) {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('turfId', turf.TurfID);
        formData.append('rating', reviewForm.rating);
        formData.append('reviewText', reviewForm.reviewText);
        
        for (let i = 0; i < reviewForm.imageFiles.length; i++) {
          formData.append('images', reviewForm.imageFiles[i]);
        }

        res = await fetch(`${API}/api/reviews`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch(`${API}/api/reviews`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: parseInt(userId),
            turfId: turf.TurfID,
            rating: reviewForm.rating,
            reviewText: reviewForm.reviewText
          })
        });
      }

      if (res.ok) {
        setReviewForm({ rating: 0, reviewText: '', imageFiles: [] });
        setShowReviewForm(false);
        fetchReviews();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit review.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const openChatSidebar = (contactUserId, contactRole) => {
    window.dispatchEvent(new CustomEvent('open-chat-sidebar', {
      detail: { contactUserId, contactName: null, contactRole }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-full bg-arena-900 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10 relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-rose-500 rounded-full text-white transition-all backdrop-blur-md">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 hide-scrollbar">
          
          {/* Image Carousel Hero */}
          <div className="relative h-64 sm:h-96 bg-black flex items-center justify-center group">
            {galleryImages.length > 0 ? (
              <>
                <img src={`${API}${galleryImages[currentImageIndex]}`} alt={turf.Name} className="w-full h-full object-cover transition-opacity duration-500" />
                
                {/* Carousel Controls */}
                {galleryImages.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                      className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-emerald-500 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-emerald-500 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    
                    {/* Dots */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                      {galleryImages.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-emerald-500 scale-125' : 'bg-white/50 hover:bg-white'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-6xl opacity-30">🏟️</div>
            )}
            
            {/* Gradient Overlay for Text Visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-arena-900 via-transparent to-transparent pointer-events-none" />
            
            {/* Title & Badge */}
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center px-3 py-1 rounded-sm text-[10px] font-display tracking-[0.15em] uppercase bg-emerald-500 text-white mb-2 shadow-lg border border-emerald-300/30">{turf.SportType}</span>
              <h1 className="text-3xl sm:text-5xl font-display text-white drop-shadow-md uppercase tracking-wide leading-none">{turf.Name}</h1>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">About Venue</h3>
                  <p className="text-slate-200 leading-relaxed">{turf.Description || "No description provided."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</h3>
                  <p className="text-slate-200 flex items-start gap-2">
                    <span className="text-emerald-500">📍</span> {turf.Location || "Location not specified."}
                  </p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Price per Hour</div>
                  <div className="text-3xl font-bold text-emerald-400">Rs. {turf.PricePerHour}</div>
                  {turf.AvgRating > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      <StarRating rating={Math.round(turf.AvgRating)} />
                      <span className="text-slate-300 font-semibold">{turf.AvgRating}</span>
                      <span className="text-slate-500 text-sm">({turf.ReviewCount} reviews)</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 space-y-3">
                  <button onClick={() => { onClose(); onBookNow(turf); }} className="w-full py-3 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm uppercase tracking-widest shadow-[0_0_24px_-6px_rgba(16,185,129,0.55)] border border-emerald-400/25 hover:scale-[1.02] transition-transform">
                    Book Now
                  </button>
                  <button onClick={() => openChatSidebar(turf.OwnerID, 'Owner')} className="w-full py-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2">
                    <span>💬</span> Contact Owner
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Reviews Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Player Reviews</h2>
                {!showReviewForm && (
                  <button onClick={() => setShowReviewForm(true)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all border border-white/10">
                    Write a Review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={submitReview} className="mb-8 p-5 bg-white/5 border border-emerald-500/30 rounded-2xl animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-emerald-400">Rate your experience</h3>
                    <button type="button" onClick={() => setShowReviewForm(false)} className="text-slate-500 hover:text-white text-sm">Cancel</button>
                  </div>
                  
                  <div className="mb-4">
                    <StarRating rating={reviewForm.rating} onRate={(r) => setReviewForm({...reviewForm, rating: r})} interactive={true} />
                  </div>
                  
                  <textarea 
                    value={reviewForm.reviewText} 
                    onChange={e => setReviewForm({...reviewForm, reviewText: e.target.value})} 
                    placeholder="Tell us about the pitch quality, facilities, etc..." 
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:border-emerald-500 outline-none mb-4" 
                    rows="3" 
                  />
                  
                  <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-2">Add Photos (Optional)</label>
                    <input 
                      type="file" multiple accept="image/*" 
                      onChange={e => setReviewForm({...reviewForm, imageFiles: Array.from(e.target.files)})} 
                      className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30" 
                    />
                    
                    {reviewForm.imageFiles.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {reviewForm.imageFiles.map((file, index) => (
                          <div key={index} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all">
                    Submit Review
                  </button>
                </form>
              )}

              {/* Reviews List */}
              {loadingReviews ? (
                <div className="text-slate-400 animate-pulse">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-4xl opacity-50 mb-3 block">🌟</span>
                  <p className="text-slate-400">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.reviewId} className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                            {review.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{review.userName}</div>
                            <div className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                      
                      {review.reviewText && (
                        <p className="text-slate-300 mt-3 text-sm leading-relaxed">{review.reviewText}</p>
                      )}
                      
                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                          {review.images.map((img, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => setFullscreenImage(`${API}${img}`)}
                              className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-all group"
                            >
                              <img src={`${API}${img}`} alt={`Review photo ${idx+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Viewer Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-rose-500 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={fullscreenImage} alt="Fullscreen preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

    </div>
  );
};

export default TurfDetailModal;
