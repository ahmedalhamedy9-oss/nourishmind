import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * HeroCarousel — MasterClass-style cinematic hero
 * Data comes from Firestore `settings/heroCarousel` (array of slides)
 * Each slide: { id, title, subtitle, description, backgroundImage,
 *               backgroundVideoId, cta1Label, cta1Link, cta2Label, cta2Link,
 *               badge, type:'image'|'video' }
 * Falls back to DEFAULT_SLIDES if Firestore empty.
 */

const DEFAULT_SLIDES = [
  {
    id: '1',
    badge: 'NOURISHMIND · CME Accredited',
    title: 'Nutritional\nPsychiatry\nDiploma',
    description: 'Evidence-based nutrition strategies for mental health — for psychiatrists and physicians.',
    backgroundImage: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1600&q=85',
    cta1Label: 'Enroll Now',
    cta1Link: '/courses',
    cta2Label: 'Watch Trailer',
    cta2Link: '/courses',
  },
  {
    id: '2',
    badge: 'NEW COURSE',
    title: 'Gut-Brain\nAxis\nMasterclass',
    description: 'Understand the microbiome-mood connection and apply it in your clinical practice.',
    backgroundImage: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=1600&q=85',
    cta1Label: 'Start Learning',
    cta1Link: '/courses',
    cta2Label: 'Learn More',
    cta2Link: '/courses',
  },
  {
    id: '3',
    badge: 'FEATURED',
    title: 'Metabolic\nPsychiatry\nFramework',
    description: 'Build your metabolic biomarker toolkit for treatment-resistant psychiatric cases.',
    backgroundImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1600&q=85',
    cta1Label: 'Explore Course',
    cta1Link: '/courses',
    cta2Label: 'Browse All',
    cta2Link: '/courses',
  },
];

const getBunnyEmbed = (videoId) =>
  `https://iframe.mediadelivery.net/embed/683192/${videoId}?autoplay=1&loop=1&muted=1&controls=0&preload=true`;

const HeroCarousel = ({ slides: propSlides }) => {
  const navigate = useNavigate();
  const slides = (propSlides && propSlides.length > 0) ? propSlides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const total = slides.length;

  const go = (n) => {
    if (animating) return;
    setAnimating(true);
    setCurrent((n + total) % total);
    setTimeout(() => setAnimating(false), 700);
  };

  const resetAuto = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => go(current + 1), 6000);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 6000);
    return () => clearInterval(timerRef.current);
  }, [total]);

  const slide = slides[current];

  return (
    <section className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: '600px' }}>

      {/* ── SLIDES (crossfade) ── */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          {s.type === 'video' && s.backgroundVideoId ? (
            <iframe
              src={getBunnyEmbed(s.backgroundVideoId)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
              allow="autoplay"
              title={s.title}
            />
          ) : (
            <img
              src={s.backgroundImage}
              alt={s.title}
              className="w-full h-full object-cover object-center"
              style={{ transform: i === current ? 'scale(1.03)' : 'scale(1)', transition: 'transform 8s ease-out' }}
            />
          )}
          {/* Cinematic gradient overlays */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)'
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)'
          }} />
        </div>
      ))}

      {/* ── CONTENT ── */}
      <div
        className="absolute inset-0 flex flex-col justify-center"
        style={{ zIndex: 10, padding: '0 48px', paddingTop: '72px' }}
      >
        <div
          key={current}
          style={{ animation: 'heroFadeUp 0.7s ease-out both', maxWidth: '600px' }}
        >
          {/* Badge */}
          {slide.badge && (
            <p style={{
              color: 'hsl(var(--primary))',
              fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              {slide.badge}
            </p>
          )}

          {/* Title */}
          <h1 style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            fontWeight: 900, lineHeight: 1.05,
            color: '#fff', marginBottom: '20px',
            whiteSpace: 'pre-line'
          }}>
            {slide.title}
          </h1>

          {/* Description */}
          {slide.description && (
            <p style={{
              fontSize: '1rem', color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.7, marginBottom: '32px', maxWidth: '440px'
            }}>
              {slide.description}
            </p>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {slide.cta1Label && (
              <button
                onClick={() => navigate(slide.cta1Link || '/courses')}
                style={{
                  background: 'hsl(var(--primary))',
                  color: '#000', border: 'none', cursor: 'pointer',
                  padding: '13px 28px', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--primary) / 0.85)'}
                onMouseLeave={e => e.currentTarget.style.background = 'hsl(var(--primary))'}
              >
                <Play size={16} fill="black" />
                {slide.cta1Label}
              </button>
            )}
            {slide.cta2Label && (
              <button
                onClick={() => navigate(slide.cta2Link || '/courses')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer', padding: '13px 28px',
                  borderRadius: '8px', fontWeight: 600,
                  fontSize: '0.95rem', backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                {slide.cta2Label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ARROWS ── */}
      {total > 1 && (
        <>
          <button
            onClick={() => { go(current - 1); resetAuto(); }}
            style={{
              position: 'absolute', left: '16px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 20,
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', width: '44px', height: '44px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(42,157,143,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => { go(current + 1); resetAuto(); }}
            style={{
              position: 'absolute', right: '16px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 20,
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', width: '44px', height: '44px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(42,157,143,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* ── DOTS ── */}
      {total > 1 && (
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 20,
          display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i); resetAuto(); }}
              style={{
                width: i === current ? '28px' : '8px',
                height: '8px', borderRadius: '4px', border: 'none',
                background: i === current ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'all 0.3s', padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'rgba(255,255,255,0.1)', zIndex: 20,
      }}>
        <div
          key={current}
          style={{
            height: '100%', background: 'hsl(var(--primary))',
            animation: 'heroProgress 6s linear forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
      `}</style>
    </section>
  );
};

export default HeroCarousel;
