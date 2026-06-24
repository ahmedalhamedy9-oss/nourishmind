import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * HeroCarousel — MasterClass cinematic carousel
 * 100% Firebase-driven. No hardcoded placeholders.
 * Data source: Firestore `settings/heroCarousel` → { slides: [...] }
 *
 * Each slide:
 *   id, badge, title (use \n for line breaks), description,
 *   type: 'image' | 'video'
 *   backgroundImage (Cloudinary URL)  — when type='image'
 *   backgroundVideoId (Bunny video ID) — when type='video'
 *   cta1Label, cta1Link, cta2Label, cta2Link
 *
 * If no slides in Firestore → renders nothing (null).
 * Admin Panel → 🎬 Hero Carousel tab to manage slides.
 */

const BUNNY_LIBRARY = '683192';

const getBunnyEmbed = (videoId) =>
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY}/${videoId}?autoplay=1&loop=1&muted=1&controls=0&preload=true&responsive=false`;

const HeroCarousel = () => {
  const navigate = useNavigate();
  const [slides,    setSlides]    = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [loaded,    setLoaded]    = useState(false);
  const [animKey,   setAnimKey]   = useState(0);
  const timerRef = useRef(null);

  // ── Load slides from Firestore ──
  useEffect(() => {
    getDoc(doc(db, 'settings', 'heroCarousel'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.slides) && data.slides.length > 0) {
            setSlides(data.slides);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const total = slides.length;

  // ── Auto-advance ──
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
      setAnimKey(k => k + 1);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [total]);

  const go = (n) => {
    clearInterval(timerRef.current);
    setCurrent((n + total) % total);
    setAnimKey(k => k + 1);
    // restart auto
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
      setAnimKey(k => k + 1);
    }, 6000);
  };

  // ── Nothing to show ──
  if (!loaded || total === 0) return null;

  const slide = slides[current];

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: '600px',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* ── BACKGROUNDS (crossfade between slides) ── */}
      {slides.map((s, i) => (
        <div
          key={s.id || i}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
            zIndex: i === current ? 1 : 0,
          }}
        >
          {s.type === 'video' && s.backgroundVideoId ? (
            <iframe
              src={getBunnyEmbed(s.backgroundVideoId)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                border: 'none', pointerEvents: 'none',
                objectFit: 'cover',
              }}
              allow="autoplay"
              title={s.title}
            />
          ) : s.backgroundImage ? (
            <img
              src={s.backgroundImage}
              alt={s.title}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                transform: i === current ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 8s ease-out',
              }}
            />
          ) : (
            /* Solid dark fallback if admin hasn't uploaded media yet */
            <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }} />
          )}

          {/* Cinematic gradient overlays */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.08) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 45%)',
          }} />
        </div>
      ))}

      {/* ── CONTENT ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 48px',
        paddingTop: '72px',
        zIndex: 10,
      }}>
        <div
          key={animKey}
          style={{
            maxWidth: '600px',
            animation: 'heroFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {/* Badge */}
          {slide.badge && (
            <span style={{
              display: 'inline-block',
              background: 'hsl(var(--primary))',
              color: '#000',
              fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '4px 12px', borderRadius: '6px',
              marginBottom: '20px',
            }}>
              {slide.badge}
            </span>
          )}

          {/* Title — \n becomes line break */}
          <h1 style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
            fontWeight: 900, lineHeight: 1.04,
            color: '#fff', marginBottom: '20px',
            whiteSpace: 'pre-line',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}>
            {slide.title}
          </h1>

          {/* Description */}
          {slide.description && (
            <p style={{
              fontSize: '1rem', color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7, marginBottom: '32px',
              maxWidth: '460px',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}>
              {slide.description}
            </p>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {slide.cta1Label && (
              <button
                onClick={() => navigate(slide.cta1Link || '/courses')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'hsl(var(--primary))', color: '#000',
                  border: 'none', cursor: 'pointer',
                  padding: '13px 28px', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(42,157,143,0.4)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--primary) / 0.85)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Play size={15} fill="black" />
                {slide.cta1Label}
              </button>
            )}
            {slide.cta2Label && (
              <button
                onClick={() => navigate(slide.cta2Link || '/courses')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  padding: '13px 28px', borderRadius: '8px',
                  fontWeight: 600, fontSize: '0.95rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
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
            onClick={() => go(current - 1)}
            style={{
              position: 'absolute', left: '20px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 20,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', width: '46px', height: '46px',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--primary) / 0.4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => go(current + 1)}
            style={{
              position: 'absolute', right: '20px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 20,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', width: '46px', height: '46px',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--primary) / 0.4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ── DOTS ── */}
      {total > 1 && (
        <div style={{
          position: 'absolute', bottom: '40px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 20,
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width: i === current ? '28px' : '8px',
                height: '8px', borderRadius: '4px',
                border: 'none', padding: 0, cursor: 'pointer',
                background: i === current
                  ? 'hsl(var(--primary))'
                  : 'rgba(255,255,255,0.3)',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          ))}
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2px', background: 'rgba(255,255,255,0.08)', zIndex: 20,
      }}>
        <div
          key={`progress-${current}-${animKey}`}
          style={{
            height: '100%',
            background: 'hsl(var(--primary))',
            animation: 'heroProgress 6s linear forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
};

export default HeroCarousel;
