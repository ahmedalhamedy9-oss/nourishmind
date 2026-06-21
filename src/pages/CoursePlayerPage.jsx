import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle, Circle, Lock, Play, List,
  ChevronDown, ChevronUp, SkipForward, SkipBack, BookOpen,
  Volume2, Gauge, Heart, Award, MessageCircle, Calendar,
  FileText,
} from 'lucide-react';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';

/* ── Bunny embed URL ── */
const getBunnyEmbedUrl = (url, opts = {}) => {
  if (!url) return null;
  try {
    let embedUrl = url
      .replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/')
      .replace('player.mediadelivery.net/embed/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(embedUrl);
    u.searchParams.set('autoplay', opts.autoplay !== false ? 'true' : 'false');
    u.searchParams.set('muted',    'false');
    u.searchParams.set('controls', 'true');
    return u.toString();
  } catch { return url; }
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/* ── Speed Control ── */
const SpeedControl = ({ speed, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o=>!o)} title="Playback speed"
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
          color: speed!==1?'#4a9b8e':'rgba(200,220,215,0.75)',
          background: speed!==1?'rgba(74,155,142,0.12)':'transparent',
          border:'1px solid '+(speed!==1?'rgba(74,155,142,0.4)':'rgba(255,255,255,0.12)'), transition:'all .15s' }}>
        <Gauge size={13}/> {speed}x
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:200, background:'#131720',
          border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, overflow:'hidden', minWidth:80,
          boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              style={{ display:'block', width:'100%', textAlign:'center', padding:'7px 16px', fontSize:12, fontWeight:600,
                cursor:'pointer', border:'none', color:s===speed?'#4a9b8e':'rgba(200,220,215,0.8)',
                background:s===speed?'rgba(74,155,142,0.12)':'transparent', transition:'background .1s' }}
              onMouseEnter={e=>{ if(s!==speed) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
              onMouseLeave={e=>{ if(s!==speed) e.currentTarget.style.background='transparent'; }}>
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── 3 Action Buttons under each lesson ── */
const LessonActions = ({ course, isCompleted, whatsappPhone, activeLesson }) => {
  const navigate = useNavigate();
  const [certToast, setCertToast] = React.useState(false);

  const handleCertificate = () => {
    if (!isCompleted) {
      setCertToast(true);
      setTimeout(() => setCertToast(false), 3000);
      return;
    }
    navigate('/certificates');
  };

  const handleWhatsApp = () => {
    if (!whatsappPhone) return;
    const num = whatsappPhone.replace(/[^0-9]/g, '');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://wa.me/${num}`
      : `https://web.whatsapp.com/send?phone=${num}`;
    window.open(url, '_blank');
  };

  const handleBookSession = () => {
    if (!whatsappPhone) return;
    const num = whatsappPhone.replace(/[^0-9]/g, '');
    const courseTitle = course?.title || 'this course';
    const instructorName = course?.instructor || 'the Lecturer';
    const message = encodeURIComponent(
      `Hello! I just finished watching "${courseTitle}" with ${instructorName} and I would like to book an appointment with the Lecturer. Could you please help me schedule one? 🙏`
    );
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://wa.me/${num}?text=${message}`
      : `https://web.whatsapp.com/send?phone=${num}&text=${message}`;
    window.open(url, '_blank');
  };

  const pdfHref = activeLesson?.pdfUrl
    ? activeLesson.pdfUrl.includes('drive.google.com/file/')
      ? 'https://drive.google.com/uc?export=download&id=' + activeLesson.pdfUrl.replace(/.*\/d\/([^/]+).*/, '$1')
      : activeLesson.pdfUrl
    : null;

  const actions = [
    ...(pdfHref ? [{
      icon: FileText,
      label: 'Download PDF Summary',
      sublabel: 'Lesson reference guide',
      color: 'rgba(201,168,76,0.9)',
      bg: 'rgba(201,168,76,0.08)',
      border: 'rgba(201,168,76,0.3)',
      onClick: () => window.open(pdfHref, '_blank'),
    }] : []),
    {
      icon: Award,
      label: 'Acquire your accredited certification',
      sublabel: isCompleted ? 'View your certificate' : 'Complete the course first',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      border: isCompleted ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)',
      onClick: handleCertificate,
    },
    {
      icon: MessageCircle,
      label: 'Contact us on WhatsApp',
      sublabel: 'We usually reply within minutes',
      color: '#25D366',
      bg: 'rgba(37,211,102,0.08)',
      border: 'rgba(37,211,102,0.25)',
      onClick: handleWhatsApp,
    },
    {
      icon: Calendar,
      label: 'Book an appointment with the Lecturer',
      sublabel: 'Request a personal consultation',
      color: '#5fbfb0',
      bg: 'rgba(74,155,142,0.08)',
      border: 'rgba(74,155,142,0.25)',
      onClick: handleBookSession,
    },
  ];

  return (
    <div style={{ padding:'16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      {certToast && (
        <div style={{
          marginBottom: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn .2s ease'
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <p style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, margin: 0 }}>
            Complete the full course first to acquire your certification.
          </p>
        </div>
      )}
      <p style={{ color:'rgba(200,220,215,0.4)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
        What's next?
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {actions.map(({ icon: Icon, label, sublabel, color, bg, border, onClick }) => (
          <button key={label} onClick={onClick}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12,
              background:bg, border:`1px solid ${border}`, cursor:'pointer', textAlign:'left',
              transition:'all .15s', width:'100%' }}
            onMouseEnter={e => { e.currentTarget.style.opacity='0.85'; e.currentTarget.style.transform='translateX(2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateX(0)'; }}
          >
            <div style={{ width:36, height:36, borderRadius:10, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0, lineHeight:1.3 }}>{label}</p>
              <p style={{ color:'rgba(200,220,215,0.45)', fontSize:11, margin:'2px 0 0' }}>{sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main Player ── */
const CoursePlayerPage = () => {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { currentUser } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const course = courses.find(c => c.id === id);

  const [activeLesson,     setActiveLesson]     = useState(null);
  const [autoplayNext,     setAutoplayNext]      = useState(false);
  const [completedLessons, setCompletedLessons]  = useState([]);
  const [showSidebar,      setShowSidebar]       = useState(false);
  const [expandedSections, setExpandedSections]  = useState({});
  const [isEnrolled,       setIsEnrolled]        = useState(false);
  const [isMobile,         setIsMobile]          = useState(false);
  const [speed,            setSpeed]             = useState(1);
  const [wishlisted,       setWishlisted]        = useState(false);
  const [wishlistBusy,     setWishlistBusy]      = useState(false);
  const [courseComplete,   setCourseComplete]    = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [whatsappPhone,    setWhatsappPhone]     = useState('');
  const [showTapHint,      setShowTapHint]       = useState(false);
  const tapHintTimer = useRef(null);
  const iframeKey = useRef(0);
  const iframeRef = useRef(null);

  /* Load WhatsApp number from Firestore settings */
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'contact'),
      snap => { if (snap.exists()) setWhatsappPhone(snap.data().whatsapp || ''); },
      () => {}
    );
    return unsub;
  }, []);

  /* Show "Tap for sound" hint briefly on mobile when a new lesson loads */
  useEffect(() => {
    if (!isMobile || !activeLesson) return;
    setShowTapHint(true);
    clearTimeout(tapHintTimer.current);
    tapHintTimer.current = setTimeout(() => setShowTapHint(false), 3000);
    return () => clearTimeout(tapHintTimer.current);
  }, [activeLesson?.id, isMobile]);

  const applySpeed = useCallback((s) => {
    setSpeed(s);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event:'command', func:'setPlaybackRate', args:[s] }), '*'
      );
    } catch(_) {}
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setShowSidebar(!isMobile); }, [isMobile]);

  useEffect(() => {
    if (!course?.sections?.length) return;
    const expanded = {};
    course.sections.forEach(s => { expanded[s.id] = true; });
    setExpandedSections(expanded);
    setActiveLesson(prev => {
      if (prev) return prev;
      const first = course.sections[0]?.lessons?.[0] || null;
      if (first) setAutoplayNext(true);
      return first;
    });
  }, [course?.sections]);

  useEffect(() => {
    if (!currentUser || !course) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        setIsEnrolled(data.enrolledCourses?.includes(id) || false);
        const completed = data.progress?.[id + '_completed'] || [];
        setCompletedLessons(completed);
        setWishlisted((data.wishlist || []).includes(id));
        const allCount = course.sections?.flatMap(s=>s.lessons||[]).length || 0;
        setCourseComplete(allCount > 0 && completed.length >= allCount);
        const lastId = data.progress?.[id+'_lastLesson'];
        if (lastId && course.sections) {
          for (const section of course.sections) {
            const found = section.lessons?.find(l => l.id === lastId);
            if (found) { setActiveLesson(found); setAutoplayNext(true); break; }
          }
        }
      } catch(_) {}
    };
    load();
  }, [currentUser, course, id]);

  const canWatch = (lesson) => {
    if (!lesson) return false;
    if (lesson.free) return true;
    if (!currentUser) return false;
    return isEnrolled;
  };

  const selectLesson = (lesson) => {
    if (!canWatch(lesson)) return;
    iframeKey.current += 1;
    setAutoplayNext(true);
    setActiveLesson(lesson);
    setSpeed(1);
    if (isMobile) setShowSidebar(false);
  };

  const allLessons = course?.sections?.flatMap(s => s.lessons || []) || [];
  const activeIdx  = allLessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson = activeIdx > 0 ? allLessons[activeIdx-1] : null;
  const nextLesson = activeIdx >= 0 && activeIdx < allLessons.length-1 ? allLessons[activeIdx+1] : null;

  const markComplete = async (lesson) => {
    if (!currentUser || !lesson) return;
    const newCompleted = completedLessons.includes(lesson.id)
      ? completedLessons.filter(l => l !== lesson.id)
      : [...completedLessons, lesson.id];
    setCompletedLessons(newCompleted);
    const pct = Math.round((newCompleted.length / (allLessons.length || 1)) * 100);
    const isNowComplete = newCompleted.length >= allLessons.length && allLessons.length > 0;
    setCourseComplete(isNowComplete);
    if (isNowComplete) {
      setShowCompletionBanner(true);
      setTimeout(() => {
        navigate('/certificates', { state: { justCompletedCourseId: id } });
      }, 3500);
    }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ['progress.'+id+'_completed']:  newCompleted,
        ['progress.'+id+'_lastLesson']: lesson.id,
        ['progress.'+id]:               pct,
      });
    } catch(_) {}
  };

  const toggleWishlist = async () => {
    if (!currentUser || wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      const current = snap.exists() ? (snap.data().wishlist||[]) : [];
      const updated = wishlisted ? current.filter(x=>x!==id) : [...current, id];
      await updateDoc(doc(db,'users',currentUser.uid), { wishlist:updated });
      setWishlisted(!wishlisted);
    } catch(_) {} finally { setWishlistBusy(false); }
  };

  const totalLessons  = allLessons.length;
  const progressPct   = totalLessons ? Math.round((completedLessons.length/totalLessons)*100) : 0;
  const activeSection = course?.sections?.find(s=>s.lessons?.some(l=>l.id===activeLesson?.id));

  if (coursesLoading) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid #4a9b8e', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!course) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
      Course not found
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#0f1117', fontFamily:'system-ui,sans-serif' }}>

      {/* ── Completion Banner ── */}
      {showCompletionBanner && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'linear-gradient(135deg,#16a34a,#15803d)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 24px rgba(22,163,74,0.5)', animation:'slideDown 0.4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={22} color="#fff" />
            </div>
            <div>
              <p style={{ color:'#fff', fontWeight:800, fontSize:15, margin:0 }}>🎉 Course Completed!</p>
              <p style={{ color:'rgba(255,255,255,0.8)', fontSize:12, margin:'2px 0 0' }}>Redirecting you to your certificates…</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => navigate('/certificates')} style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', borderRadius:8, color:'#fff', fontWeight:700, fontSize:12, padding:'7px 16px', cursor:'pointer' }}>
              View Certificates →
            </button>
            <button onClick={() => setShowCompletionBanner(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', padding:4 }}>✕</button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px', height:52, background:'#131720', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          <button onClick={() => navigate('/course/'+id)}
            style={{ display:'flex', alignItems:'center', gap:4, color:'rgba(200,220,215,0.7)', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, padding:0, flexShrink:0 }}>
            <ChevronLeft size={16}/> Back
          </button>
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:10, minWidth:0, flex:1 }}>
            <p style={{ color:'rgba(200,220,215,0.45)', fontSize:10, lineHeight:1, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{course.category||''}</p>
            <p style={{ color:'#fff', fontWeight:600, fontSize:13, lineHeight:1, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {activeLesson?.title||'Select a lesson'}
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:8 }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:100, height:5, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', background: progressPct===100?'#22c55e':'#4a9b8e', borderRadius:3, width:progressPct+'%', transition:'width 0.5s' }}/>
              </div>
              <span style={{ color:'rgba(200,220,215,0.6)', fontSize:11, minWidth:28 }}>{progressPct}%</span>
            </div>
          )}

          {currentUser && (
            <button onClick={toggleWishlist} disabled={wishlistBusy} title={wishlisted?'Remove from wishlist':'Add to wishlist'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:7, border:'none', cursor:'pointer',
                background:wishlisted?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.05)',
                color:wishlisted?'#ef4444':'rgba(200,220,215,0.5)', transition:'all .15s' }}>
              <Heart size={15} fill={wishlisted?'#ef4444':'none'}/>
            </button>
          )}

          <SpeedControl speed={speed} onChange={applySpeed}/>

          <button onClick={() => setShowSidebar(s=>!s)}
            style={{ display:'flex', alignItems:'center', gap:6,
              color:showSidebar?'#4a9b8e':'rgba(200,220,215,0.7)',
              background:showSidebar?'rgba(74,155,142,0.1)':'transparent',
              border:'1px solid '+(showSidebar?'rgba(74,155,142,0.4)':'rgba(255,255,255,0.12)'),
              borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            <List size={14}/> {isMobile?'':'Lessons'}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>

        {/* VIDEO COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0, overflowY:'auto' }}>

          {/* Player */}
          <div style={{ width:'100%', aspectRatio:'16/9', background:'#000', flexShrink:0, position:'relative' }}>
            {activeLesson ? (
              canWatch(activeLesson) ? (
                activeLesson.videoUrl ? (
                  <>
                    <iframe key={iframeKey.current} ref={iframeRef}
                      src={getBunnyEmbedUrl(activeLesson.videoUrl,{autoplay:autoplayNext})}
                      style={{ width:'100%', height:'100%', border:'none', display:'block', position:'absolute', inset:0 }}
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                      referrerPolicy="origin" allowFullScreen title={activeLesson.title}/>
                    {isMobile && showTapHint && (
                      <div style={{ position:'absolute', top:8, right:8, zIndex:10, pointerEvents:'none',
                        transition:'opacity 0.5s', opacity: showTapHint ? 1 : 0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(0,0,0,0.6)', borderRadius:6, padding:'4px 8px' }}>
                          <Volume2 size={12} color="rgba(255,255,255,0.7)"/>
                          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:500 }}>Tap player for sound</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#0a0f0e' }}>
                    <Play size={32} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)"/>
                    <p style={{ color:'rgba(200,220,215,0.4)', fontSize:13, margin:0 }}>No video URL for this lesson</p>
                  </div>
                )
              ) : (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
                  <Lock size={36} color="rgba(74,155,142,0.4)"/>
                  <p style={{ color:'#fff', fontWeight:700, fontSize:18, margin:0 }}>Subscribe to Watch</p>
                  <button onClick={() => navigate('/pricing')}
                    style={{ background:'#4a9b8e', color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 }}>
                    View Plans
                  </button>
                </div>
              )
            ) : (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <p style={{ color:'rgba(200,220,215,0.3)', fontSize:14, margin:0 }}>Select a lesson to start</p>
              </div>
            )}
          </div>

          {/* Lesson info */}
          {activeLesson && (
            <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6, flexWrap:'wrap' }}>
                  <BookOpen size={11} color="rgba(200,220,215,0.35)"/>
                  <span style={{ color:'rgba(200,220,215,0.4)', fontSize:11 }}>{course.title}</span>
                  {activeSection && <>
                    <span style={{ color:'rgba(200,220,215,0.25)', fontSize:11 }}>›</span>
                    <span style={{ color:'rgba(200,220,215,0.4)', fontSize:11 }}>{activeSection.title}</span>
                  </>}
                </div>
                <h2 style={{ color:'#fff', fontWeight:700, fontSize:15, lineHeight:1.3, margin:'0 0 4px' }}>{activeLesson.title}</h2>
                <p style={{ color:'rgba(200,220,215,0.45)', fontSize:12, margin:0 }}>
                  {activeLesson.duration||'—'} · video
                  {activeLesson.free && <span style={{ marginLeft:8, color:'#4ade80', fontSize:10, fontWeight:700, border:'1px solid rgba(74,222,128,0.3)', padding:'1px 6px', borderRadius:4 }}>Free</span>}
                </p>
              </div>
              {canWatch(activeLesson) && (
                <button onClick={() => markComplete(activeLesson)}
                  style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, padding:'8px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                    background:completedLessons.includes(activeLesson.id)?'rgba(74,155,142,0.15)':'transparent',
                    border:'1px solid '+(completedLessons.includes(activeLesson.id)?'rgba(74,155,142,0.5)':'rgba(255,255,255,0.15)'),
                    color:completedLessons.includes(activeLesson.id)?'#4a9b8e':'rgba(200,220,215,0.75)' }}>
                  {completedLessons.includes(activeLesson.id)
                    ? <><CheckCircle size={14}/> Completed</>
                    : <><Circle size={14}/> Mark Done</>}
                </button>
              )}
            </div>
          )}

          {/* Prev / Next */}
          {activeLesson && (
            <div style={{ display:'flex', gap:10, padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => prevLesson && selectLesson(prevLesson)} disabled={!prevLesson||!canWatch(prevLesson)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:prevLesson?'pointer':'not-allowed', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:prevLesson?'rgba(200,220,215,0.7)':'rgba(200,220,215,0.2)' }}>
                <SkipBack size={12}/> Previous
              </button>
              <button onClick={() => nextLesson && selectLesson(nextLesson)} disabled={!nextLesson||!canWatch(nextLesson)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:nextLesson?'pointer':'not-allowed',
                  background:nextLesson&&canWatch(nextLesson)?'rgba(74,155,142,0.12)':'transparent',
                  border:'1px solid '+(nextLesson&&canWatch(nextLesson)?'rgba(74,155,142,0.35)':'rgba(255,255,255,0.1)'),
                  color:nextLesson&&canWatch(nextLesson)?'#4a9b8e':'rgba(200,220,215,0.2)' }}>
                Next <SkipForward size={12}/>
              </button>
            </div>
          )}

          {/* ── 3 Action Buttons ── always visible so WhatsApp/Book buttons work */}
          {activeLesson && (
            <LessonActions course={course} isCompleted={courseComplete} whatsappPhone={whatsappPhone} activeLesson={activeLesson} />
          )}
        </div>

        {/* SIDEBAR */}
        {showSidebar && (
          <>
            {isMobile && (
              <div onClick={() => setShowSidebar(false)}
                style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 }}/>
            )}
            <div style={{
              ...(isMobile?{position:'fixed',top:52,right:0,bottom:0,zIndex:50,width:Math.min(320,window.innerWidth*0.85)}:{width:320,flexShrink:0}),
              display:'flex', flexDirection:'column', borderLeft:'1px solid rgba(255,255,255,0.08)', background:'#131720', overflowY:'auto'
            }}>
              <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
                <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>Course Content</p>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                  <span style={{ color:'rgba(200,220,215,0.45)', fontSize:11 }}>{completedLessons.length}/{totalLessons} lessons</span>
                  <span style={{ color:'rgba(200,220,215,0.45)', fontSize:11 }}>{progressPct}% complete</span>
                </div>
              </div>
              <div style={{ height:3, background:'rgba(255,255,255,0.07)', flexShrink:0 }}>
                <div style={{ height:'100%', background:progressPct===100?'#22c55e':'#4a9b8e', width:progressPct+'%', transition:'width 0.5s' }}/>
              </div>

              {course.sections?.length>0 ? course.sections.map(section => {
                const secDone  = section.lessons?.filter(l=>completedLessons.includes(l.id)).length||0;
                const secTotal = section.lessons?.length||0;
                const isOpen   = expandedSections[section.id];
                return (
                  <div key={section.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={() => setExpandedSections(prev=>({...prev,[section.id]:!prev[section.id]}))}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                      <div>
                        <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0 }}>{section.title}</p>
                        <p style={{ color:'rgba(200,220,215,0.4)', fontSize:11, margin:'2px 0 0' }}>{secDone}/{secTotal}{section.duration?' · '+section.duration:''}</p>
                      </div>
                      {isOpen?<ChevronUp size={14} color="rgba(200,220,215,0.4)"/>:<ChevronDown size={14} color="rgba(200,220,215,0.4)"/>}
                    </button>
                    {isOpen && section.lessons?.map(lesson => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      const isActive    = activeLesson?.id===lesson.id;
                      const watchable   = canWatch(lesson);
                      return (
                        <button key={lesson.id} onClick={() => selectLesson(lesson)} disabled={!watchable}
                          style={{ width:'100%', display:'flex', alignItems:'flex-start', gap:10, padding:'9px 18px',
                            background:isActive?'rgba(74,155,142,0.1)':'transparent', border:'none',
                            borderLeft:'3px solid '+(isActive?'#4a9b8e':'transparent'),
                            cursor:watchable?'pointer':'not-allowed', opacity:watchable?1:0.4, textAlign:'left' }}>
                          <div style={{ flexShrink:0, marginTop:2, width:16, height:16, borderRadius:'50%',
                            border:'2px solid '+(isCompleted||isActive?'#4a9b8e':'rgba(200,220,215,0.25)'),
                            background:isCompleted?'#4a9b8e':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isCompleted
                              ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              : watchable
                                ? <Play size={6} color={isActive?'#4a9b8e':'rgba(200,220,215,0.5)'} fill={isActive?'#4a9b8e':'rgba(200,220,215,0.5)'} style={{marginLeft:1}}/>
                                : <Lock size={6} color="rgba(200,220,215,0.4)"/>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:12, fontWeight:isActive?600:500, lineHeight:1.4, color:isActive?'#4a9b8e':isCompleted?'rgba(200,220,215,0.7)':'rgba(200,220,215,0.85)' }}>
                              {lesson.title}
                              {lesson.free && <span style={{ marginLeft:6, color:'#4ade80', fontSize:9, fontWeight:700, border:'1px solid rgba(74,222,128,0.3)', padding:'1px 5px', borderRadius:3 }}>Free</span>}
                            </p>
                            <p style={{ margin:'2px 0 0', color:'rgba(200,220,215,0.35)', fontSize:10 }}>{lesson.duration||''}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              }) : (
                <div style={{ padding:40, textAlign:'center', color:'rgba(200,220,215,0.3)', fontSize:13 }}>No lessons added yet</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoursePlayerPage;







