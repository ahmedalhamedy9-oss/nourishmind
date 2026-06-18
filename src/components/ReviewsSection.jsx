import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr } from '@/lib/translations';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const PLACEHOLDER_REVIEWS = [
  {
    id: 'r1',
    name: 'Nour Al-Huda',
    location: 'Cairo, Egypt',
    rating: 5,
    text: '"This platform completely changed my perspective on mental health. The content is deep and beautifully organized."',
    course: 'Secrets of Mental Health',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
  },
  {
    id: 'r2',
    name: 'Mohammed Al-Ali',
    location: 'Riyadh, Saudi Arabia',
    rating: 5,
    text: '"The best online platform for nutrition. Professional instructors and scientifically sound, easy-to-follow content."',
    course: 'Therapeutic Nutrition',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
  },
  {
    id: 'r3',
    name: 'Sara Al-Jamil',
    location: 'Dubai, UAE',
    rating: 5,
    text: '"The mindfulness course made a real difference in my daily life. Highly recommended for anyone feeling overwhelmed."',
    course: 'Mindfulness Practice',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
  },
];

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
      {review.avatar ? (
        <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {review.name?.[0] || 'S'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{review.name}</p>
        <p className="text-gray-500 text-xs">{review.location}</p>
      </div>
      {review.course && (
        <span className="text-primary text-xs font-semibold shrink-0">{review.course}</span>
      )}
    </div>
  </div>
);

const ReviewsSection = () => {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'),
      snap => setReviews(snap.empty ? PLACEHOLDER_REVIEWS : snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setReviews(PLACEHOLDER_REVIEWS)
    );
    return unsub;
  }, []);

  return (
    <section className="py-16 px-4 sm:px-12 max-w-7xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-10">{tr('whatStudentsSay', lang)}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
