import React, { useEffect, useState, useRef } from 'react';
import LogoCanvas from '@/components/LogoCanvas';

const FEATURES = [
  { from: 0,  to: 30,  text: '✦ Accredited courses by leading medical institutions' },
  { from: 30, to: 55,  text: '✦ Internationally recognized certificates' },
  { from: 55, to: 75,  text: '✦ Learn at your own pace, anytime & anywhere' },
  { from: 75, to: 90,  text: '✦ Join thousands of medical professionals across the Arab world' },
  { from: 90, to: 100, text: '✦ The Science of Mind. The Art of Healing.' },
];

const getFeature = (progress) =>
  FEATURES.find(f => progress >= f.from && progress < f.to) || FEATURES[FEATURES.length - 1];

const SplashScreen = ({ onComplete }) => {
  const [progress,    setProgress]    = useState(0);
  const [visible,     setVisible]     = useState(true);
  const [logoReady,   setLogoReady]   = useState(false);
  const [textReady,   setTextReady]   = useState(false);
  const [subReady,    setSubReady]    = useState(false);
  const [featText,    setFeatText]    = useState(FEATURES[0].text);
  const [featVisible, setFeatVisible] = useState(false);
  const intervalRef = useRef(null);
  const doneRef     = useRef(false);
  const prevFeat    = useRef(FEATURES[0].text);

  /* Animate logo → title → subtitle — tighter timing */
  useEffect(() => {
    const t1 = setTimeout(() => setLogoReady(true),  80);
    const t2 = setTimeout(() => setTextReady(true),  350);
    const t3 = setTimeout(() => setSubReady(true),   600);
    const t4 = setTimeout(() => setFeatVisible(true),900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  /* Faster progress — completes in ~2.5s naturally */
  useEffect(() => {
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += current < 60 ? 2.5 : current < 80 ? 1.5 : current < 92 ? 0.8 : 0;
      const next = Math.min(current, 92);
      setProgress(prev => Math.max(prev, next));

      const newFeat = getFeature(next).text;
      if (newFeat !== prevFeat.current) {
        setFeatVisible(false);
        setTimeout(() => {
          setFeatText(newFeat);
          prevFeat.current = newFeat;
          setFeatVisible(true);
        }, 300);
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, []);

  const completeSplash = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(intervalRef.current);
    setFeatVisible(false);
    setTimeout(() => {
      setFeatText('✦ The Science of Mind. The Art of Healing.');
      setFeatVisible(true);
    }, 300);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 350);
    }, 700);
  };

  /* Firebase ready → complete immediately */
  useEffect(() => {
    if (onComplete._ready) completeSplash();
  }, [onComplete._ready]);

  /* Hard cap: 3 seconds max (was 8s) */
  useEffect(() => {
    const fallback = setTimeout(completeSplash, 3000);
    return () => clearTimeout(fallback);
  }, []);

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
      transition:     'opacity 0.35s ease',
    }}>

      {/* Logo */}
      <div style={{
        transform:  logoReady ? 'translateY(0) scale(1)' : 'translateY(-18px) scale(0.88)',
        opacity:    logoReady ? 1 : 0,
        transition: 'transform 0.55s cubic-bezier(.22,1,.36,1), opacity 0.55s ease',
        marginBottom: 24,
      }}>
        <LogoCanvas src="/logo.png" height={72} />
      </div>

      {/* Title */}
      <div style={{
        opacity:    textReady ? 1 : 0,
        transform:  textReady ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
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
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        color:      'rgba(255,255,255,0.4)',
        fontSize:   13,
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '0.02em',
      }}>
        Preparing the best experience for you...
      </div>

      {/* Feature text */}
      <div style={{
        position:   'absolute',
        bottom:     110,
        left:       32,
        right:      32,
        textAlign:  'center',
        opacity:    featVisible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        color:      'rgba(255,255,255,0.65)',
        fontSize:   13,
        fontWeight: 500,
        fontFamily: "'Outfit', sans-serif",
        letterSpacing: '0.03em',
        minHeight:  20,
      }}>
        {featText}
      </div>

      {/* Progress bar */}
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
            transition: 'width 0.3s ease',
            borderRadius: 4,
          }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
