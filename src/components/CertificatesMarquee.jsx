import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr } from '@/lib/translations';

// Placeholder certificates for when none are uploaded yet
// Proper certificate-looking placeholder images
const PLACEHOLDER_CERTS = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=600&q=80', alt: 'Certificate of Completion' },
  { id: 'p2', url: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&q=80', alt: 'Professional Certificate' },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=600&q=80', alt: 'Excellence Award' },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&q=80', alt: 'Achievement Certificate' },
  { id: 'p5', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80', alt: 'Nutrition Certificate' },
];

const CertificatesCarousel = ({ certificates = [] }) => {
  const { lang, isAr } = useLanguage();
  const items = certificates.length >= 1 ? certificates : PLACEHOLDER_CERTS;
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  const next = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(prev => (prev + 1) % items.length);
      setAnimating(false);
    }, 400);
  };

  // Auto-advance every 3 seconds
  useEffect(() => {
    timerRef.current = setInterval(next, 3000);
    return () => clearInterval(timerRef.current);
  }, [items.length, animating]);

  const getStyle = (index) => {
    const total = items.length;
    let offset = index - active;

    // Normalize to range [-floor(n/2), ceil(n/2)]
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const absOffset = Math.abs(offset);

    if (absOffset > 2) return { display: 'none' };

    const isCenter = offset === 0;
    const isLeft = offset === -1;
    const isRight = offset === 1;
    const isFarLeft = offset === -2;
    const isFarRight = offset === 2;

    let transform, zIndex, opacity, filter;

    if (isCenter) {
      transform = 'translateX(0%) translateZ(0px) rotateY(0deg) scale(1)';
      zIndex = 10;
      opacity = 1;
      filter = 'brightness(1)';
    } else if (isLeft) {
      transform = 'translateX(-65%) translateZ(-120px) rotateY(25deg) scale(0.85)';
      zIndex = 5;
      opacity = 0.85;
      filter = 'brightness(0.6)';
    } else if (isRight) {
      transform = 'translateX(65%) translateZ(-120px) rotateY(-25deg) scale(0.85)';
      zIndex = 5;
      opacity = 0.85;
      filter = 'brightness(0.6)';
    } else if (isFarLeft) {
      transform = 'translateX(-110%) translateZ(-250px) rotateY(35deg) scale(0.7)';
      zIndex = 2;
      opacity = 0.5;
      filter = 'brightness(0.4)';
    } else if (isFarRight) {
      transform = 'translateX(110%) translateZ(-250px) rotateY(-35deg) scale(0.7)';
      zIndex = 2;
      opacity = 0.5;
      filter = 'brightness(0.4)';
    }

    return {
      transform,
      zIndex,
      opacity,
      filter,
      transition: animating
        ? 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, filter 0.5s ease'
        : 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, filter 0.5s ease',
    };
  };

  return (
    <section className="py-20 overflow-hidden bg-gradient-to-b from-background via-background to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-12 mb-12 text-center">
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Certificates</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          {tr('earnCerts', lang)}
        </h2>
        <p className="text-gray-400 mt-2 max-w-lg mx-auto">
          {tr('earnCertsDesc', lang)}
        </p>
      </div>

      {/* 3D Carousel */}
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{ height: '400px', perspective: '1000px' }}
      >
        {items.map((cert, index) => {
          const style = getStyle(index);
          if (style.display === 'none') return null;

          const isCenter = index === active;

          return (
            <div
              key={cert.id}
              className="absolute cursor-pointer"
              style={{
                width: '280px',
                height: '360px',
                ...style,
              }}
              onClick={() => {
                if (!isCenter) {
                  clearInterval(timerRef.current);
                  setActive(index);
                  timerRef.current = setInterval(next, 3000);
                }
              }}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={cert.url}
                  alt={cert.alt}
                  className="w-full h-full object-cover"
                />
                {isCenter && cert.alt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-bold text-sm">{cert.alt}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`rounded-full transition-all duration-300 ${i === active ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </section>
  );
};

export default CertificatesCarousel;
