import React, { useState, useEffect, useRef } from 'react';

const CertificatesCarousel = ({ certificates = [] }) => {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  // Wait for Firebase data before showing anything
  useEffect(() => {
    if (certificates.length > 0) {
      setLoaded(true);
      setActive(0);
    }
  }, [certificates]);

  const items = certificates;

  const next = () => {
    if (animating || items.length === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(prev => (prev + 1) % items.length);
      setAnimating(false);
    }, 400);
  };

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    timerRef.current = setInterval(next, 3000);
    return () => clearInterval(timerRef.current);
  }, [loaded, items.length, animating]);

  const getStyle = (index) => {
    const total = items.length;
    let offset = index - active;
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
      zIndex = 10; opacity = 1; filter = 'brightness(1)';
    } else if (isLeft) {
      transform = 'translateX(-65%) translateZ(-120px) rotateY(25deg) scale(0.85)';
      zIndex = 5; opacity = 0.85; filter = 'brightness(0.6)';
    } else if (isRight) {
      transform = 'translateX(65%) translateZ(-120px) rotateY(-25deg) scale(0.85)';
      zIndex = 5; opacity = 0.85; filter = 'brightness(0.6)';
    } else if (isFarLeft) {
      transform = 'translateX(-110%) translateZ(-250px) rotateY(35deg) scale(0.7)';
      zIndex = 2; opacity = 0.5; filter = 'brightness(0.4)';
    } else if (isFarRight) {
      transform = 'translateX(110%) translateZ(-250px) rotateY(-35deg) scale(0.7)';
      zIndex = 2; opacity = 0.5; filter = 'brightness(0.4)';
    }
    return {
      transform, zIndex, opacity, filter,
      transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, filter 0.5s ease',
    };
  };

  return (
    <section className="py-20 overflow-hidden bg-gradient-to-b from-background via-background to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-12 mb-12 text-center">
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Certificates</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Complete courses and earn certificates recognized by leading healthcare institutions.
        </h2>
      </div>

      <div
        className="relative mx-auto flex items-center justify-center"
        style={{ height: '400px', perspective: '1000px' }}
      >
        {!loaded ? (
          /* Skeleton loader - no placeholders, just a clean loading state */
          <div className="flex items-center justify-center gap-6">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="rounded-2xl bg-white/5 animate-pulse border border-white/10"
                style={{
                  width: i === 1 ? '280px' : '220px',
                  height: i === 1 ? '360px' : '290px',
                  opacity: i === 1 ? 1 : 0.5,
                  transform: i === 0 ? 'translateX(-30%) scale(0.85)' : i === 2 ? 'translateX(30%) scale(0.85)' : 'none',
                }}
              />
            ))}
          </div>
        ) : items.length === 0 ? null : (
          items.map((cert, index) => {
            const style = getStyle(index);
            if (style.display === 'none') return null;
            const isCenter = index === active;
            return (
              <div
                key={cert.id}
                className="absolute cursor-pointer"
                style={{ width: '280px', height: '360px', ...style }}
                onClick={() => {
                  if (!isCenter) {
                    clearInterval(timerRef.current);
                    setActive(index);
                    timerRef.current = setInterval(next, 3000);
                  }
                }}
              >
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img src={cert.url} alt={cert.alt} className="w-full h-full object-cover" />
                  {isCenter && cert.alt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-white font-bold text-sm">{cert.alt}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dots - only show when loaded and has items */}
      {loaded && items.length > 0 && (
        <div className="flex justify-center gap-2 mt-8">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${i === active ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CertificatesCarousel;
