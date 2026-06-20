import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr } from '@/lib/translations';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LS_KEY = 'nm_reviews_v1';
const fromLS = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const toLS = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

const StarRating = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} className={`w-5 h-5 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
    ))}
  </div>
);

const ReviewCard = ({ review }) => (
  <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors">
    <StarRating rating={review.rating} />
    <p className="text-gray-200 text-base leading-relaxed flex-1">{review.text}</p>
    <div className="flex items-center gap-3 pt-2 border-t border-border">
      {review.avatar
        ? <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full object-cover shrink-0" loading="lazy" />
        : <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">{review.name?.[0] || 'S'}</div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{review.name}</p>
        <p className="text-gray-500 text-xs">{review.location}</p>
      </div>
      {review.course && <span className="text-primary text-xs font-semibold shrink-0">{review.course}</span>}
    </div>
  </div>
);

const ReviewSkeleton = () => (
  <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
    <div className="flex gap-1">{[1,2,3,4,5].map(i => <div key={i} className="w-5 h-5 rounded bg-white/5" />)}</div>
    <div className="flex flex-col gap-2 flex-1">
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-4/5" />
      <div className="h-3 bg-white/5 rounded w-3/5" />
    </div>
    <div className="flex items-center gap-3 pt-2 border-t border-border">
      <div className="w-12 h-12 rounded-full bg-white/5 shrink-0" />
      <div className="flex flex-col gap-1 flex-1">
        <div className="h-3 bg-white/5 rounded w-24" />
        <div className="h-2 bg-white/5 rounded w-16" />
      </div>
    </div>
  </div>
);

const ReviewsSection = () => {
  const { lang } = useLanguage();
  const cached = fromLS();
  const [reviews, setReviews] = useState(cached || []);
  const [loaded, setLoaded] = useState(!!cached);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'),
      snap => {
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setReviews(data);
          toLS(data);
        }
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return unsub;
  }, []);

  return (
    <section className="py-16 px-4 sm:px-12 max-w-7xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10">{tr('whatStudentsSay', lang)}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {!loaded
          ? [1,2,3].map(i => <ReviewSkeleton key={i} />)
          : reviews.map(review => <ReviewCard key={review.id} review={review} />)
        }
      </div>
    </section>
  );
};

export default ReviewsSection;
