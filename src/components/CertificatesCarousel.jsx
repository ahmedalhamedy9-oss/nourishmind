import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CertificatesCarousel — spotlight carousel
 * Data: Firestore `certificates` collection (managed from Admin Panel)
 * Center card = full size + bright
 * Side cards   = scaled down + dimmed
 * Auto-advances every 4s, stops when out of viewport
 */
const CertificatesCarousel = () => {
  const [certs,   setCerts]   = useState([]);
  const [current, setCurrent] = useState(0);
  const [inView,  setInView]  = useState(true);
  const sectionRef = useRef(null);
  const timerRef   = useRef(null);

  /* ── Load from Firestore ── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'certificates'),
      snap => setCerts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  /* ── IntersectionObserver ── */
  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold: 0.2 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const total = certs.length;

  /* ── Auto-advance ── */
  const startTimer = () => {
    clearInterval(timerRef.current);
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
    }, 4000);
  };

  useEffect(() => {
    if (inView && total > 1) startTimer();
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [total, inView]);

  const go = (n) => {
    setCurrent((n + total) % total);
    startTimer();
  };

  if (total === 0) return null;

  /* ── Visible window: prev, current, next (+ 2 side extras if enough) ── */
  const getPos = (i) => {
    // distance from current (-total/2 … +total/2)
    let d = i - current;
    if (d > total / 2)  d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  // Show up to 5 cards: -2, -1, 0, +1, +2
  const visible = certs
    .map((c, i) => ({ ...c, _i: i, _pos: getPos(i) }))
    .filter(c => Math.abs(c._pos) <= 2)
    .sort((a, b) => a._pos - b._pos);

  const cardStyle = (pos) => {
    const abs = Math.abs(pos);
    const scale     = abs === 0 ? 1 : abs === 1 ? 0.78 : 0.62;
    const opacity   = abs === 0 ? 1 : abs === 1 ? 0.55 : 0.3;
    const zIndex    = 10 - abs;
    const blur      = abs === 0 ? 0 : abs === 1 ? 1 : 2;
    // horizontal offset in %
    const tx = pos * 52;

    return {
      position:  'absolute',
      top:       '50%',
      left:      '50%',
      transform: `translate(calc(-50% + ${tx}%), -50%) scale(${scale})`,
      opacity,
      zIndex,
      filter:    blur ? `blur(${blur}px)` : 'none',
      transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
      cursor:    pos !== 0 ? 'pointer' : 'default',
      width:     '340px',
    };
  };

  const activeCert = certs[current];

  return (
    <section
      ref={sectionRef}
      style={{
        padding: '80px 0 60px',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '40px', padding: '0 48px' }}>
        <p style={{
          color: 'hsl(var(--primary))', fontSize: '0.72rem', fontWeight: 700,
          letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px',
        }}>
          NourishMind Certificates
        </p>
        <h2 style={{
          fontFamily: "'Playfair Display','Georgia',serif",
          fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900,
          color: '#fff', lineHeight: 1.15,
        }}>
          Proof You've Trained with the Best
        </h2>
      </div>

      {/* ── Spotlight stage ── */}
      <div style={{
        position: 'relative',
        height: '260px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {visible.map(cert => (
          <div
            key={cert.id}
            style={cardStyle(cert._pos)}
            onClick={() => cert._pos !== 0 && go(cert._i)}
          >
            <div style={{
              borderRadius: '14px',
              overflow: 'hidden',
              border: cert._pos === 0
                ? '1.5px solid hsl(var(--primary) / 0.6)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: cert._pos === 0
                ? '0 20px 60px rgba(42,157,143,0.25), 0 0 0 1px hsl(var(--primary)/0.2)'
                : 'none',
              background: '#111',
              aspectRatio: '4/3',
            }}>
              {cert.url ? (
                <img
                  src={cert.url}
                  alt={cert.alt || cert.name || 'Certificate'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  draggable={false}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), transparent)',
                  color: 'hsl(var(--primary))', fontSize: '2rem',
                }}>
                  🏆
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Arrows */}
        {total > 1 && (
          <>
            <button onClick={() => go(current - 1)} style={{
              position: 'absolute', left: '24px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 30,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', width: '40px', height: '40px',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--primary)/0.4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            >
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(current + 1)} style={{
              position: 'absolute', right: '24px', top: '50%',
              transform: 'translateY(-50%)', zIndex: 30,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', width: '40px', height: '40px',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--primary)/0.4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* ── Active cert info ── */}
      {activeCert && (
        <div style={{
          textAlign: 'center', marginTop: '28px',
          padding: '0 48px',
          animation: 'certFadeUp 0.4s ease both',
        }}
          key={current}
        >
          {activeCert.name && (
            <p style={{
              fontFamily: "'Playfair Display','Georgia',serif",
              fontSize: '1.1rem', fontWeight: 700,
              color: '#fff', marginBottom: '6px',
            }}>
              {activeCert.name}
            </p>
          )}
          {activeCert.description && (
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
              {activeCert.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {activeCert.price && (
              <span style={{
                background: 'hsl(var(--primary)/0.12)',
                border: '1px solid hsl(var(--primary)/0.25)',
                color: 'hsl(var(--primary))',
                fontSize: '0.8rem', fontWeight: 700,
                padding: '4px 14px', borderRadius: '20px',
              }}>
                {activeCert.price}
              </span>
            )}
            {activeCert.delivery && (
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                📦 {activeCert.delivery}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Dots ── */}
      {total > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: '7px', marginTop: '28px',
        }}>
          {certs.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{
              width: i === current ? '24px' : '7px',
              height: '7px', borderRadius: '4px',
              border: 'none', padding: 0, cursor: 'pointer',
              background: i === current
                ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes certFadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </section>
  );
};

export default CertificatesCarousel;
