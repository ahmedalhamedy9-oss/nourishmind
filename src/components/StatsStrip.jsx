import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * StatsStrip
 * 4 stats loaded from Firestore `settings/stats`:
 *   { stat1_value, stat1_label,
 *     stat2_value, stat2_label,
 *     stat3_value, stat3_label,
 *     stat4_value, stat4_label }
 * Defaults shown if not set in Admin.
 * Edit from Admin Panel → 📊 Stats Strip tab.
 */

const DEFAULTS = [
  { value: '2,400+', label: 'Enrolled Learners' },
  { value: '100+',   label: 'Accredited Courses' },
  { value: '96%',    label: 'Completion Rate'    },
  { value: 'Internationally\nAccredited', label: '' },
];

const StatsStrip = () => {
  const [stats,   setStats]   = useState(DEFAULTS);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  /* ── Load from Firestore (live) ── */
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'stats'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setStats([
        { value: d.stat1_value || DEFAULTS[0].value, label: d.stat1_label || DEFAULTS[0].label },
        { value: d.stat2_value || DEFAULTS[1].value, label: d.stat2_label || DEFAULTS[1].label },
        { value: d.stat3_value || DEFAULTS[2].value, label: d.stat3_label || DEFAULTS[2].label },
        { value: d.stat4_value || DEFAULTS[3].value, label: d.stat4_label || DEFAULTS[3].label },
      ]);
    }, () => {});
    return unsub;
  }, []);

  /* ── Fade in on scroll ── */
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.25 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        margin: '0 32px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '36px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {stats.map((s, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 24px', gap: '6px',
          borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}>
          <span style={{
            fontFamily: "'Playfair Display','Georgia',serif",
            fontSize: 'clamp(1.6rem,2.8vw,2.6rem)',
            fontWeight: 900,
            color: 'hsl(var(--primary))',
            lineHeight: 1.1,
            textAlign: 'center',
            whiteSpace: 'pre-line',
          }}>
            {s.value}
          </span>
          {s.label && (
            <span style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 500,
              textAlign: 'center',
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
