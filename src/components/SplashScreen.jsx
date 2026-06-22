import React, { useEffect, useState, useRef } from 'react';
import LogoCanvas from '@/components/LogoCanvas';

const FEATURES = [
  { from: 0,  to: 20,  text: '✦ Accredited courses by leading medical institutions' },
  { from: 20, to: 40,  text: '✦ Internationally recognized certificates' },
  { from: 40, to: 60,  text: '✦ Learn at your own pace, anytime & anywhere' },
  { from: 60, to: 75,  text: '✦ Book private sessions directly with your instructor' },
  { from: 75, to: 90,  text: '✦ Join thousands of medical professionals across the Arab world' },
  { from: 90, to: 100, text: '✦ The Science of Mind. The Art of Healing.' },
];

const getFeature = (progress) => {
  return FEATURES.find(f => progress >= f.from && progress < f.to) || FEATURES[FEATURES.length - 1];
};

const SplashScreen = ({ onComplete }) => {
  const [progress,   setProgress]   = useState(0);
  const [visible,    setVisible]    = useState(true);
  const [logoReady,  setLogoReady]  = useState(false);
  const [textReady,  setTextReady]  = useState(false);
  const [subReady,   setSubReady]   = useState(false);
  const [featText,   setFeatText]   = useState(FEATURES[0].text);
  const [featVisible,setFeatVisible]= useState(false);
  const intervalRef  = useRef(null);
  const doneRef      = useRef(false);
  const prevFeat     = useRef(FEATURES[0].text);

  /* Animate logo → title → subtitle */
  useEffect(() => {
    const t1 = setTimeout(() => setLogoReady(true),  100);
    const t2 = setTimeout(() => setTextReady(true),  500);
    const t3 = setTimeout(() => setSubReady(true),   900);
    const t4 = setTimeout(() => setFeatVisible(true),1300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  /* Simulated progress — slow & steady, max 92% until Firebase */
  useEffect(() => {
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += current < 70 ? 1.2 : current < 85 ? 0.6 : current < 92 ? 0.2 : 0;
      const next = Math.min(current, 92);
      setProgress(prev => Math.max(prev, next));

      /* Feature text crossfade when segment changes */
      const newFeat = getFeature(next).text;
      if (newFeat !== prevFeat.current) {
        setFeatVisible(false);
        setTimeout(() => {
          setFeatText(newFeat);
          prevFeat.current = newFeat;
          setFeatVisible(true);
        }, 400);
      }
    }, 300);
    return () => clearInterval(intervalRef.current);
  }, []);

  /* Firebase ready OR timeout → complete to 100% then call onComplete */
  useEffect(() => {
    // Fallback timeout — if Firebase doesn't respond in 8s (Safari issue), proceed anyway
    const fallbackTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        clearInterval(intervalRef.current);
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          setTimeout(onComplete, 400);
        }, 600);
      }
    }, 8000);

    if (onComplete._ready && !doneRef.current) {
      clearTimeout(fallbackTimer);
      doneRef.current = true;
      clearInterval(intervalRef.current);
      setFeatVisible(false);
      setTimeout(() => {
        setFeatText('✦ The Science of Mind. The Art of Healing.');
        setFeatVisible(true);
      }, 400);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 400);
      }, 900);
    }

    return () => clearTimeout(fallbackTimer);
  }, [onComplete._ready]);

  if (!visible) return null;

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         9999,
      background:     '#090e1a',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      opacity:        visible ? 1 : 0,
      transition:     'opacity 0.4s ease',
    }}>

      {/* Logo */}
      <div style={{
        transform:  logoReady ? 'translateY(0) scale(1)' : 'translateY(-18px) scale(0.88)',
        opacity:    logoReady ? 1 : 0,
        transition: 'transform 0.65s cubic-bezier(.22,1,.36,1), opacity 0.65s ease',
        marginBottom: 24,
      }}>
        <LogoCanvas src="/logo.png" height={72} />
      </div>

      {/* Title */}
      <div style={{
        opacity:    textReady ? 1 : 0,
        transform:  textReady ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        color:      '#ffffff',
        fontSize:   22,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: "'Outfit', sans-serif",
        marginBottom: 10,
      }}>
        NourishMind
      </div>

      {/* Subtitle */}
      <div style={{
        opacity:    subReady ? 1 : 0,
        transform:  subReady ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        color:      'rgba(255,255,255,0.4)',
        fontSize:   13,
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '0.02em',
        marginBottom: 0,
      }}>
        Preparing the best experience for you...
      </div>

      {/* Feature text — crossfades between segments */}
      <div style={{
        position:   'absolute',
        bottom:     110,
        left:       32,
        right:      32,
        textAlign:  'center',
        opacity:    featVisible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        color:      'rgba(255,255,255,0.65)',
        fontSize:   13,
        fontWeight: 500,
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '0.03em',
        minHeight:  20,
      }}>
        {featText}
      </div>

      {/* Progress bar — 60px from bottom */}
      <div style={{ position:'absolute', bottom:60, left:32, right:32 }}>
        <div style={{
          display:'flex', justifyContent:'flex-end',
          marginBottom: 6,
          color: 'rgba(255,255,255,0.3)',
          fontSize: 11,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {Math.round(progress)}%
        </div>
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.08)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width:  `${progress}%`,
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
