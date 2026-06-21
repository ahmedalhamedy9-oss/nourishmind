import React, { useEffect, useState, useRef } from 'react';
import LogoCanvas from '@/components/LogoCanvas';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress]   = useState(0);
  const [visible, setVisible]     = useState(true);
  const [logoReady, setLogoReady] = useState(false);
  const [textReady, setTextReady] = useState(false);
  const [subReady,  setSubReady]  = useState(false);
  const intervalRef = useRef(null);
  const doneRef     = useRef(false);

  /* Animate logo → text → subtitle in sequence */
  useEffect(() => {
    const t1 = setTimeout(() => setLogoReady(true), 100);
    const t2 = setTimeout(() => setTextReady(true), 500);
    const t3 = setTimeout(() => setSubReady(true),  900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* Simulated progress:
     - يمشي ببطء ثابت بـ 1% كل 300ms
     - يوصل لـ 92% بحد أقصى ويفضل يتحرك ببطء جداً
     - لما Firebase يجاوب يكمل لـ 100% */
  useEffect(() => {
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += current < 70 ? 1.2 : current < 85 ? 0.6 : current < 92 ? 0.2 : 0;
      setProgress(prev => {
        const next = Math.min(current, 92);
        return Math.max(prev, next); // never go backwards
      });
    }, 300);
    return () => clearInterval(intervalRef.current);
  }, []);

  /* Called by App when Firebase auth is ready */
  useEffect(() => {
    if (onComplete._ready && !doneRef.current) {
      doneRef.current = true;
      clearInterval(intervalRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 400);
      }, 700);
    }
  }, [onComplete._ready]);

  if (!visible) return null;

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        background:     '#090e1a',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'opacity 0.4s ease',
        opacity:        visible ? 1 : 0,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          transform:  logoReady ? 'translateY(0) scale(1)' : 'translateY(-18px) scale(0.88)',
          opacity:    logoReady ? 1 : 0,
          transition: 'transform 0.65s cubic-bezier(.22,1,.36,1), opacity 0.65s ease',
          marginBottom: 24,
        }}
      >
        <LogoCanvas src="/logo.png" height={72} />
      </div>

      {/* ── Title ── */}
      <div
        style={{
          opacity:    textReady ? 1 : 0,
          transform:  textReady ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          color:      '#ffffff',
          fontSize:   22,
          fontWeight: 700,
          letterSpacing: '0.04em',
          fontFamily: "'Outfit', sans-serif",
          marginBottom: 10,
        }}
      >
        NourishMind
      </div>

      {/* ── Subtitle ── */}
      <div
        style={{
          opacity:    subReady ? 1 : 0,
          transform:  subReady ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          color:      'rgba(255,255,255,0.45)',
          fontSize:   13,
          fontWeight: 400,
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: '0.02em',
        }}
      >
        Preparing the best experience for you...
      </div>

      {/* ── Progress bar + percentage — 60px من أسفل ── */}
      <div style={{
        position: 'absolute',
        bottom:   60,
        left:     32,
        right:    32,
      }}>
        {/* Percentage */}
        <div style={{
          display:        'flex',
          justifyContent: 'flex-end',
          marginBottom:   6,
          color:          'rgba(255,255,255,0.35)',
          fontSize:        11,
          fontFamily:     "'Outfit', sans-serif",
        }}>
          {Math.round(progress)}%
        </div>

        {/* Bar track */}
        <div style={{
          height:       3,
          background:   'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow:     'hidden',
        }}>
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: 'linear-gradient(90deg, #4a9b8e, #6dbfb0)',
            transition: 'width 0.4s ease',
            borderRadius: 4,
          }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
