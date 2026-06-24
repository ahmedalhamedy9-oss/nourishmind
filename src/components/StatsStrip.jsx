import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * StatsStrip — animated stats bar
 *
 * Stats:
 *   1. Enrolled Learners  — starts from `settings/stats.enrolledBase`,
 *                           auto-increments +5 every 60s client-side
 *   2. Accredited Courses — live count of courses with accredited:true
 *   3. Completion Rate    — from `settings/stats.completionRate` (e.g. "96%")
 *   4. Internationally Accredited — static label, no institution names
 *
 * Admin control: settings/stats → { enrolledBase: 2400, completionRate: "96%" }
 * (Add a "Stats" section to Admin Panel to edit these)
 */

/* Animated number counter */
const Counter = ({ target, suffix = '', duration = 1800 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!target) return;
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  /* Format with comma: 2400 → 2,400 */
  const formatted = display.toLocaleString('en-US');
  return <span>{formatted}{suffix}</span>;
};

const StatsStrip = () => {
  const [enrolledBase,     setEnrolledBase]     = useState(null);  // from Firebase
  const [enrolledLive,     setEnrolledLive]     = useState(null);  // base + increments
  const [accreditedCount,  setAccreditedCount]  = useState(null);
  const [completionRate,   setCompletionRate]   = useState('96%');
  const [visible,          setVisible]          = useState(false);
  const stripRef = useRef(null);
  const tickRef  = useRef(null);

  /* ── Load settings/stats from Firestore ── */
  useEffect(() => {
    getDoc(doc(db, 'settings', 'stats'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.enrolledBase)    setEnrolledBase(Number(d.enrolledBase));
          if (d.completionRate)  setCompletionRate(String(d.completionRate));
        } else {
          // default if not set yet in Admin
          setEnrolledBase(2400);
        }
      })
      .catch(() => setEnrolledBase(2400));
  }, []);

  /* ── Live-count accredited courses ── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'courses'),
      snap => {
        const count = snap.docs.filter(d => d.data().accredited === true).length;
        setAccreditedCount(count);
      },
      () => {}
    );
    return unsub;
  }, []);

  /* ── Auto-increment enrolled +5 every 60s ── */
  useEffect(() => {
    if (enrolledBase === null) return;
    setEnrolledLive(enrolledBase);
    tickRef.current = setInterval(() => {
      setEnrolledLive(n => n + 5);
    }, 60_000); // every 60 seconds
    return () => clearInterval(tickRef.current);
  }, [enrolledBase]);

  /* ── IntersectionObserver — trigger counter animation on scroll-in ── */
  useEffect(() => {
    if (!stripRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(stripRef.current);
    return () => obs.disconnect();
  }, []);

  const stats = [
    {
      value:   enrolledLive,
      suffix:  '+',
      label:   'Enrolled Learners',
      animate: true,
    },
    {
      value:   accreditedCount,
      suffix:  '',
      label:   'Accredited Courses',
      animate: true,
    },
    {
      value:   null,
      text:    completionRate,
      label:   'Completion Rate',
      animate: false,
    },
    {
      value:   null,
      text:    'Internationally\nAccredited',
      label:   '',
      animate: false,
      large:   true,
    },
  ];

  return (
    <div
      ref={stripRef}
      style={{
        margin:       '0 32px',
        borderRadius: '16px',
        background:   'rgba(255,255,255,0.03)',
        border:       '1px solid rgba(255,255,255,0.07)',
        padding:      '36px 0',
        display:      'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}
    >
      {stats.map((s, i) => (
        <div key={i} style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 24px',
          borderRight:    i < stats.length - 1
            ? '1px solid rgba(255,255,255,0.07)'
            : 'none',
          gap: '6px',
        }}>
          {/* ── Big number / text ── */}
          <span style={{
            fontFamily:  s.large ? "'Playfair Display','Georgia',serif" : "'Playfair Display','Georgia',serif",
            fontSize:    s.large ? 'clamp(1.4rem,2.5vw,2rem)' : 'clamp(1.8rem,3vw,2.8rem)',
            fontWeight:  900,
            color:       'hsl(var(--primary))',
            lineHeight:  1.1,
            textAlign:   'center',
            whiteSpace:  'pre-line',
          }}>
            {s.animate && visible && s.value !== null ? (
              <Counter target={s.value} suffix={s.suffix} />
            ) : s.animate && s.value !== null ? (
              /* before scroll-in: show 0 */
              <span>0{s.suffix}</span>
            ) : (
              s.text || '—'
            )}
          </span>

          {/* ── Label ── */}
          {s.label && (
            <span style={{
              fontSize:      '0.82rem',
              color:         'rgba(255,255,255,0.5)',
              fontWeight:    500,
              letterSpacing: '0.3px',
              textAlign:     'center',
            }}>
              {s.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsStrip;
