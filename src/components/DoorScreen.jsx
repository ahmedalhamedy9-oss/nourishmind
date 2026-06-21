import React, { useEffect, useState } from 'react';

const DoorScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('closed'); 
  // phases: closed → opening → welcome → fading → done

  useEffect(() => {
    // Start opening after short pause
    const t1 = setTimeout(() => setPhase('opening'), 200);
    // Show welcome text when doors are half open
    const t2 = setTimeout(() => setPhase('welcome'), 1000);
    // Start fading out
    const t3 = setTimeout(() => setPhase('fading'),  2800);
    // Done
    const t4 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 3400);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (phase === 'done') return null;

  const doorsOpen  = phase === 'opening' || phase === 'welcome' || phase === 'fading';
  const showText   = phase === 'welcome' || phase === 'fading';
  const isFading   = phase === 'fading';

  return (
    <div style={{
      position:   'fixed',
      inset:      0,
      zIndex:     9998,
      overflow:   'hidden',
      opacity:    isFading ? 0 : 1,
      transition: isFading ? 'opacity 0.6s ease' : 'none',
    }}>

      {/* ── Light burst in center ── */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: doorsOpen
          ? 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(201,168,76,0.18) 0%, rgba(255,240,180,0.08) 40%, transparent 70%)'
          : 'transparent',
        transition: 'background 1.2s ease',
        zIndex:     1,
        pointerEvents: 'none',
      }} />

      {/* ── Left door ── */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       0,
        width:      '50%',
        height:     '100%',
        background: 'linear-gradient(135deg, #0d1320 0%, #111827 60%, #0a0f1a 100%)',
        transform:  doorsOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 1.1s cubic-bezier(0.76, 0, 0.24, 1)',
        zIndex:     3,
        boxShadow:  doorsOpen ? 'none' : '4px 0 24px rgba(0,0,0,0.8)',
      }}>
        {/* Door detail lines */}
        <div style={{
          position: 'absolute', right: 0, top: '15%', bottom: '15%',
          width: 2,
          background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.3), transparent)',
        }} />
        <div style={{
          position: 'absolute', right: 20, top: '25%', bottom: '25%',
          width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)',
        }} />
      </div>

      {/* ── Right door ── */}
      <div style={{
        position:   'absolute',
        top:        0,
        right:      0,
        width:      '50%',
        height:     '100%',
        background: 'linear-gradient(225deg, #0d1320 0%, #111827 60%, #0a0f1a 100%)',
        transform:  doorsOpen ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform 1.1s cubic-bezier(0.76, 0, 0.24, 1)',
        zIndex:     3,
        boxShadow:  doorsOpen ? 'none' : '-4px 0 24px rgba(0,0,0,0.8)',
      }}>
        {/* Door detail lines */}
        <div style={{
          position: 'absolute', left: 0, top: '15%', bottom: '15%',
          width: 2,
          background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.3), transparent)',
        }} />
        <div style={{
          position: 'absolute', left: 20, top: '25%', bottom: '25%',
          width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)',
        }} />
      </div>

      {/* ── Welcome text — center, above the doors ── */}
      <div style={{
        position:       'absolute',
        inset:          0,
        zIndex:         4,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
      }}>
        <div style={{
          opacity:    showText ? 1 : 0,
          transform:  showText ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.95)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
          textAlign:  'center',
        }}>
          <div style={{
            color:         '#ffffff',
            fontSize:      'clamp(36px, 8vw, 72px)',
            fontWeight:    800,
            fontFamily:    "'Outfit', sans-serif",
            letterSpacing: '0.06em',
            lineHeight:    1.1,
            textShadow:    '0 0 40px rgba(201,168,76,0.4), 0 2px 20px rgba(0,0,0,0.8)',
          }}>
            Welcome
          </div>
          <div style={{
            color:         'rgba(201,168,76,0.9)',
            fontSize:      'clamp(13px, 2.5vw, 20px)',
            fontWeight:    400,
            fontFamily:    "'Outfit', sans-serif",
            letterSpacing: '0.12em',
            marginTop:     12,
            textShadow:    '0 0 20px rgba(201,168,76,0.3)',
          }}>
            The Science of Mind. The Art of Healing.
          </div>
        </div>
      </div>

      {/* ── Center seam glow when closed ── */}
      {!doorsOpen && (
        <div style={{
          position:   'absolute',
          top:        0,
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      2,
          height:     '100%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.5) 30%, rgba(255,240,180,0.8) 50%, rgba(201,168,76,0.5) 70%, transparent 100%)',
          zIndex:     5,
          filter:     'blur(2px)',
        }} />
      )}
    </div>
  );
};

export default DoorScreen;
