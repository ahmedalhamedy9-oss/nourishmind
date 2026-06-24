import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BUNNY_LIB = '683192';
const bunnyUrl  = (id) =>
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${id}` +
  `?autoplay=true&loop=true&muted=true&preload=true&responsive=true&controls=false`;

const HeroCarousel = () => {
  const navigate   = useNavigate();
  const sectionRef = useRef(null);

  const [slides,    setSlides]    = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [ready,     setReady]     = useState(false);
  const [animKey,   setAnimKey]   = useState(0);
  const [rendered,  setRendered]  = useState({ 0: true });
  // NEW: track whether the carousel is in viewport
  const [inView,    setInView]    = useState(true);

  const timerRef = useRef(null);

  /* ── Load slides ── */
  useEffect(() => {
    getDoc(doc(db, 'settings', 'heroCarousel'))
      .then(snap => {
        if (snap.exists()) {
          const s = snap.data().slides;
          if (Array.isArray(s) && s.length > 0) setSlides(s);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  /* ── IntersectionObserver: pause when scrolled away ── */
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }   // 10% visible = "in view"
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [ready]);

  const total = slides.length;

  /* ── Auto-advance (only when in view) ── */
  const startTimer = (tot) => {
    clearInterval(timerRef.current);
    if (tot <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % tot;
        setRendered(r => ({ ...r, [next]: true }));
        setAnimKey(k => k + 1);
        return next;
      });
    }, 6000);
  };

  useEffect(() => {
    if (inView) startTimer(total);
    else        clearInterval(timerRef.current);
    return ()  => clearInterval(timerRef.current);
  }, [total, inView]);

  const go = (n) => {
    const next = (n + total) % total;
    setRendered(r => ({ ...r, [next]: true }));
    setCurrent(next);
    setAnimKey(k => k + 1);
    startTimer(total);
  };

  if (!ready || total === 0) return null;

  const slide = slides[current];

  return (
    <section ref={sectionRef} style={{
      position: 'relative', width: '100%',
      height: '100vh', minHeight: '600px',
      overflow: 'hidden', background: '#000',
    }}>

      {/* ══ BACKGROUNDS ══ */}
      {slides.map((s, i) => {
        if (!rendered[i]) return null;
        const isActive = i === current;

        return (
          <div key={s.id || i} style={{
            position: 'absolute', inset: 0,
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.85s ease-in-out',
            zIndex: isActive ? 1 : 0,
            pointerEvents: 'none',
          }}>

            {s.type === 'video' && s.backgroundVideoId ? (
              <div style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
                {/* Unmount iframe when: slide inactive OR section not in viewport */}
                {(isActive && inView) && (
                  <iframe
                    src={bunnyUrl(s.backgroundVideoId)}
                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: '100vw',
                      height: '56.25vw',
                      minHeight: '100vh',
                      minWidth: '177.78vh',
                      border: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

            ) : s.backgroundImage ? (
              <img src={s.backgroundImage} alt={s.title || ''} style={{
                width:'100%', height:'100%',
                objectFit:'cover', objectPosition:'center',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 8s ease-out',
              }} />
            ) : (
              <div style={{ width:'100%', height:'100%', background:'#0a0a0f' }} />
            )}

            <div style={{ position:'absolute', inset:0, pointerEvents:'none',
              background:'linear-gradient(to right,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.42) 55%,rgba(0,0,0,0.05) 100%)' }} />
            <div style={{ position:'absolute', inset:0, pointerEvents:'none',
              background:'linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 45%)' }} />
          </div>
        );
      })}

      {/* ══ CONTENT ══ */}
      <div style={{
        position:'absolute', inset:0, zIndex:10,
        display:'flex', flexDirection:'column', justifyContent:'center',
        padding:'0 48px', paddingTop:'72px', pointerEvents:'none',
      }}>
        <div key={animKey} style={{
          maxWidth:'580px',
          animation:'heroFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both',
          pointerEvents:'auto',
        }}>
          {slide.badge && (
            <span style={{
              display:'inline-block', background:'hsl(var(--primary))', color:'#000',
              fontSize:'0.68rem', fontWeight:700, letterSpacing:'1.5px',
              textTransform:'uppercase', padding:'4px 12px',
              borderRadius:'6px', marginBottom:'20px',
            }}>{slide.badge}</span>
          )}

          <h1 style={{
            fontFamily:"'Playfair Display','Georgia',serif",
            fontSize:'clamp(2.2rem,5vw,4rem)', fontWeight:900,
            lineHeight:1.05, color:'#fff', marginBottom:'18px',
            whiteSpace:'pre-line', textShadow:'0 2px 20px rgba(0,0,0,0.5)',
          }}>{slide.title}</h1>

          {slide.description && (
            <p style={{
              fontSize:'1rem', color:'rgba(255,255,255,0.75)', lineHeight:1.7,
              marginBottom:'30px', maxWidth:'440px',
              textShadow:'0 1px 8px rgba(0,0,0,0.6)',
            }}>{slide.description}</p>
          )}

          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {slide.cta1Label && (
              <button onClick={() => navigate(slide.cta1Link || '/courses')} style={{
                display:'flex', alignItems:'center', gap:'8px',
                background:'hsl(var(--primary))', color:'#000',
                border:'none', cursor:'pointer', padding:'13px 28px',
                borderRadius:'8px', fontWeight:700, fontSize:'0.95rem',
                boxShadow:'0 4px 20px rgba(42,157,143,0.35)', transition:'all 0.2s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.opacity='0.85';e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}
              >
                <Play size={15} fill="black" />{slide.cta1Label}
              </button>
            )}
            {slide.cta2Label && (
              <button onClick={() => navigate(slide.cta2Link || '/courses')} style={{
                background:'rgba(255,255,255,0.1)', color:'#fff',
                border:'1px solid rgba(255,255,255,0.3)', cursor:'pointer',
                padding:'13px 28px', borderRadius:'8px',
                fontWeight:600, fontSize:'0.95rem',
                backdropFilter:'blur(4px)', transition:'all 0.2s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
              >
                {slide.cta2Label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ ARROWS ══ */}
      {total > 1 && (
        <>
          {[{d:-1,s:'left',icon:<ChevronLeft size={22}/>},
            {d: 1,s:'right',icon:<ChevronRight size={22}/>}].map(({d,s,icon})=>(
            <button key={s} onClick={()=>go(current+d)} style={{
              position:'absolute', [s]:'20px', top:'50%',
              transform:'translateY(-50%)', zIndex:20,
              background:'rgba(0,0,0,0.55)',
              border:'1px solid rgba(255,255,255,0.15)',
              color:'#fff', width:'46px', height:'46px',
              borderRadius:'50%', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(6px)', transition:'all 0.2s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='hsl(var(--primary) / 0.45)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.55)'}
            >{icon}</button>
          ))}
        </>
      )}

      {/* ══ DOTS ══ */}
      {total > 1 && (
        <div style={{
          position:'absolute', bottom:'40px', left:'50%',
          transform:'translateX(-50%)', zIndex:20,
          display:'flex', gap:'8px', alignItems:'center',
        }}>
          {slides.map((_,i)=>(
            <button key={i} onClick={()=>go(i)} style={{
              width:i===current?'28px':'8px', height:'8px',
              borderRadius:'4px', border:'none', padding:0, cursor:'pointer',
              background:i===current?'hsl(var(--primary))':'rgba(255,255,255,0.3)',
              transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            }}/>
          ))}
        </div>
      )}

      {/* ══ PROGRESS BAR ══ */}
      {total > 1 && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          height:'2px', background:'rgba(255,255,255,0.08)', zIndex:20,
        }}>
          <div key={`prog-${current}-${animKey}`} style={{
            height:'100%', background:'hsl(var(--primary))',
            animation: inView ? 'heroProgress 6s linear forwards' : 'none',
          }}/>
        </div>
      )}

      <style>{`
        @keyframes heroFadeUp {
          from{opacity:0;transform:translateY(28px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes heroProgress {
          from{width:0%;}
          to{width:100%;}
        }
      `}</style>
    </section>
  );
};

export default HeroCarousel;
