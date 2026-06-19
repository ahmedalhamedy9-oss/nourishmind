import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle, Circle, Lock, Play, List, X,
  ChevronDown, ChevronUp, SkipForward, SkipBack, Volume2,
  Settings, Maximize, BookOpen,
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';

/* ── Bunny embed helper ─────────────────────────────────────────────────── */
const getBunnyEmbedUrl = (url, opts = {}) => {
  if (!url) return null;
  try {
    let embedUrl = url
      .replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/')
      .replace('player.mediadelivery.net/embed/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(embedUrl);
    u.searchParams.set('autoplay',  opts.autoplay  !== false ? 'true' : 'false');
    u.searchParams.set('muted',     opts.muted     !== false ? 'true' : 'false');
    u.searchParams.set('controls',  opts.controls  !== false ? 'true' : 'false');
    if (opts.loop) u.searchParams.set('loop', 'true');
    return u.toString();
  } catch { return url; }
};

/* ── Main Component ─────────────────────────────────────────────────────── */
const CoursePlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { courses } = useCourses();
  const course = courses.find(c => c.id === id);

  const [activeLesson,      setActiveLesson]      = useState(null);
  const [autoplayNext,      setAutoplayNext]       = useState(false);
  const [completedLessons,  setCompletedLessons]   = useState([]);
  const [showSidebar,       setShowSidebar]        = useState(true);
  const [expandedSections,  setExpandedSections]   = useState({});
  const [isEnrolled,        setIsEnrolled]         = useState(false);
  const iframeKey = useRef(0);

  /* ── expand all sections when course/sections load ── */
  useEffect(() => {
    if (!course?.sections?.length) return;
    const expanded = {};
    course.sections.forEach(s => { expanded[s.id] = true; });
    setExpandedSections(expanded);
    // Set first lesson only if none selected yet
    setActiveLesson(prev => {
      if (prev) return prev;
      const first = course.sections[0]?.lessons?.[0];
      if (first) setAutoplayNext(true);
      return first || null;
    });
  }, [course?.sections]);

  /* ── load user progress ── */
  useEffect(() => {
    if (!currentUser || !course) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (!snap.exists()) return;
      const d = snap.data();
      setIsEnrolled(d.enrolledCourses?.includes(id));
      const saved = d.progress?.[id + '_completed'] || [];
      setCompletedLessons(saved);
      const lastId = d.progress?.[id + '_lastLesson'];
      if (lastId && course.sections) {
        for (const section of course.sections) {
          const found = section.lessons?.find(l => l.id === lastId);
          if (found) { setActiveLesson(found); setAutoplayNext(true); break; }
        }
      }
    };
    load();
  }, [currentUser, course, id]);

  const canWatchLesson = (lesson) => {
    if (!lesson) return false;
    if (lesson.free) return true;
    if (!currentUser) return false;
    return isEnrolled;
  };

  const selectLesson = (lesson) => {
    if (!canWatchLesson(lesson)) return;
    iframeKey.current += 1;
    setAutoplayNext(true);
    setActiveLesson(lesson);
  };

  /* navigate to prev/next lesson */
  const allLessons = course?.sections?.flatMap(s => s.lessons || []) || [];
  const activeIdx  = allLessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson = activeIdx > 0 ? allLessons[activeIdx - 1] : null;
  const nextLesson = activeIdx >= 0 && activeIdx < allLessons.length - 1 ? allLessons[activeIdx + 1] : null;

  const markComplete = async (lesson) => {
    if (!currentUser || !lesson) return;
    const newCompleted = completedLessons.includes(lesson.id)
      ? completedLessons.filter(l => l !== lesson.id)
      : [...completedLessons, lesson.id];
    setCompletedLessons(newCompleted);
    const total = allLessons.length || 1;
    const pct   = Math.round((newCompleted.length / total) * 100);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      [`progress.${id}_completed`]:  newCompleted,
      [`progress.${id}_lastLesson`]: lesson.id,
      [`progress.${id}`]:            pct,
    });
  };

  const totalLessons = allLessons.length;
  const progressPct  = totalLessons ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const activeSection = course?.sections?.find(s => s.lessons?.some(l => l.id === activeLesson?.id));

  /* ── gate ── */
  if (!course) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
      Course not found
    </div>
  );

  /* ── styles ── */
  const S = {
    topBar: {
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px', height:56,
      background:'#131720',
      borderBottom:'1px solid rgba(255,255,255,0.08)',
      flexShrink:0,
    },
    sidebar: {
      width:340, flexShrink:0,
      display:'flex', flexDirection:'column',
      borderLeft:'1px solid rgba(255,255,255,0.08)',
      background:'#131720',
      overflowY:'auto',
    },
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#0f1117', fontFamily:"'Outfit', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════ TOP BAR */}
      <div style={S.topBar}>
        {/* Left: back + title */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button
            onClick={() => navigate(`/course/${id}`)}
            style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(200,220,215,0.7)', background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:500, padding:0 }}
            onMouseEnter={e => e.currentTarget.style.color='#fff'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(200,220,215,0.7)'}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:16 }}>
            <p style={{ color:'rgba(200,220,215,0.45)', fontSize:11, lineHeight:1 }}>{course.title}</p>
            <p style={{ color:'#fff', fontWeight:600, fontSize:14, marginTop:3, lineHeight:1 }}>
              {activeLesson?.title || 'Select a lesson'}
            </p>
          </div>
        </div>

        {/* Right: progress + lessons toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          {/* Progress bar */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:160, height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'#4a9b8e', borderRadius:3, width:`${progressPct}%`, transition:'width 0.5s' }} />
            </div>
            <span style={{ color:'rgba(200,220,215,0.6)', fontSize:12, fontWeight:500, minWidth:32 }}>{progressPct}%</span>
          </div>
          {/* Lessons toggle */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            style={{
              display:'flex', alignItems:'center', gap:8,
              color: showSidebar ? '#4a9b8e' : 'rgba(200,220,215,0.7)',
              background: showSidebar ? 'rgba(74,155,142,0.1)' : 'transparent',
              border:`1px solid ${showSidebar ? 'rgba(74,155,142,0.4)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer',
              transition:'all 0.2s',
            }}
          >
            <List size={15} /> Lessons
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ════════════════════════════════════ VIDEO COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0 }}>

          {/* ── Video player ── */}
          <div style={{ position:'relative', background:'#000', flexShrink:0, aspectRatio:'16/9', maxHeight:'65vh' }}>

            {/* "Now Playing" overlay */}
            {activeLesson && canWatchLesson(activeLesson) && (
              <div style={{ position:'absolute', top:16, left:16, zIndex:10, pointerEvents:'none' }}>
                <p style={{ color:'rgba(200,220,215,0.7)', fontSize:11, fontWeight:500, lineHeight:1, marginBottom:4 }}>Now Playing</p>
                <p style={{ color:'#fff', fontWeight:700, fontSize:15, lineHeight:1.3 }}>{activeLesson.title}</p>
              </div>
            )}

            {activeLesson ? (
              canWatchLesson(activeLesson) ? (
                activeLesson.videoUrl ? (
                  <iframe
                    key={iframeKey.current}
                    src={getBunnyEmbedUrl(activeLesson.videoUrl, { autoplay: autoplayNext, muted: false })}
                    style={{ width:'100%', height:'100%', border:'none' }}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    referrerPolicy="origin"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                ) : (
                  /* No video URL — show placeholder player UI */
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#0a0f0e' }}>
                    <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <Play size={28} color="#fff" fill="#fff" style={{ marginLeft:4 }} />
                    </div>
                    <p style={{ color:'rgba(200,220,215,0.4)', fontSize:13 }}>No video URL set for this lesson</p>
                  </div>
                )
              ) : (
                /* Locked */
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
                  <Lock size={40} color="rgba(74,155,142,0.4)" />
                  <p style={{ color:'#fff', fontWeight:700, fontSize:20 }}>Subscribe to Watch</p>
                  <p style={{ color:'rgba(200,220,215,0.5)', fontSize:14, marginBottom:8 }}>This lesson is for enrolled students only</p>
                  <button
                    onClick={() => navigate('/pricing')}
                    style={{ background:'#4a9b8e', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}
                  >
                    View Plans
                  </button>
                </div>
              )
            ) : (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <p style={{ color:'rgba(200,220,215,0.3)', fontSize:14 }}>Select a lesson to start</p>
              </div>
            )}

            {/* ── Custom bottom controls bar (visual — Bunny handles real controls) ── */}
            {activeLesson && canWatchLesson(activeLesson) && activeLesson.videoUrl && (
              <div style={{
                position:'absolute', bottom:0, left:0, right:0,
                background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                padding:'32px 16px 12px',
                display:'flex', alignItems:'center', gap:14,
                pointerEvents:'none',
              }}>
                <SkipBack  size={18} color="rgba(255,255,255,0.6)" />
                <Play      size={20} color="#fff" fill="#fff" />
                <SkipForward size={18} color="rgba(255,255,255,0.6)" />
                <Volume2   size={16} color="rgba(255,255,255,0.6)" />
                <span style={{ color:'rgba(255,255,255,0.55)', fontSize:12, fontWeight:500 }}>0:00 / {activeLesson.duration || '0:00'}</span>
                <div style={{ flex:1 }} />
                <Settings  size={16} color="rgba(255,255,255,0.6)" />
                <Maximize  size={16} color="rgba(255,255,255,0.6)" />
              </div>
            )}
          </div>

          {/* ── Lesson info + Mark Complete ── */}
          {activeLesson && (
            <div style={{
              padding:'16px 24px',
              borderBottom:'1px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16,
            }}>
              <div>
                {/* Breadcrumb */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <BookOpen size={12} color="rgba(200,220,215,0.35)" />
                  <span style={{ color:'rgba(200,220,215,0.4)', fontSize:12 }}>{course.title}</span>
                  {activeSection && (
                    <>
                      <span style={{ color:'rgba(200,220,215,0.25)', fontSize:12 }}>›</span>
                      <span style={{ color:'rgba(200,220,215,0.4)', fontSize:12 }}>{activeSection.title}</span>
                    </>
                  )}
                </div>
                {/* Title */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <Play size={14} color="rgba(200,220,215,0.5)" />
                  <h2 style={{ color:'#fff', fontWeight:700, fontSize:17, lineHeight:1.3, margin:0 }}>{activeLesson.title}</h2>
                </div>
                <p style={{ color:'rgba(200,220,215,0.45)', fontSize:13, margin:0 }}>
                  {activeLesson.duration || '—'} · video
                  {activeLesson.free && (
                    <span style={{ marginLeft:10, color:'#4ade80', fontSize:11, fontWeight:700, border:'1px solid rgba(74,222,128,0.3)', padding:'2px 8px', borderRadius:4 }}>
                      Free
                    </span>
                  )}
                </p>
              </div>

              {/* Mark Complete button */}
              {canWatchLesson(activeLesson) && (
                <button
                  onClick={() => markComplete(activeLesson)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, flexShrink:0,
                    padding:'10px 20px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                    transition:'all 0.2s',
                    background: completedLessons.includes(activeLesson.id) ? 'rgba(74,155,142,0.15)' : 'transparent',
                    border: completedLessons.includes(activeLesson.id) ? '1px solid rgba(74,155,142,0.5)' : '1px solid rgba(255,255,255,0.15)',
                    color: completedLessons.includes(activeLesson.id) ? '#4a9b8e' : 'rgba(200,220,215,0.75)',
                  }}
                >
                  {completedLessons.includes(activeLesson.id)
                    ? <><CheckCircle size={16} /> Completed</>
                    : <><Circle size={16} /> Mark Complete</>
                  }
                </button>
              )}
            </div>
          )}

          {/* ── Prev / Next navigation ── */}
          {activeLesson && (
            <div style={{ display:'flex', gap:12, padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => prevLesson && selectLesson(prevLesson)}
                disabled={!prevLesson || !canWatchLesson(prevLesson)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, cursor: prevLesson ? 'pointer' : 'not-allowed',
                  background:'transparent', border:'1px solid rgba(255,255,255,0.1)',
                  color: prevLesson ? 'rgba(200,220,215,0.7)' : 'rgba(200,220,215,0.2)',
                  transition:'all 0.2s',
                }}
              >
                <SkipBack size={13} /> Previous
              </button>
              <button
                onClick={() => nextLesson && selectLesson(nextLesson)}
                disabled={!nextLesson || !canWatchLesson(nextLesson)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, cursor: nextLesson ? 'pointer' : 'not-allowed',
                  background: nextLesson && canWatchLesson(nextLesson) ? 'rgba(74,155,142,0.12)' : 'transparent',
                  border:`1px solid ${nextLesson && canWatchLesson(nextLesson) ? 'rgba(74,155,142,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: nextLesson && canWatchLesson(nextLesson) ? '#4a9b8e' : 'rgba(200,220,215,0.2)',
                  transition:'all 0.2s',
                }}
              >
                Next <SkipForward size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════ SIDEBAR */}
        {showSidebar && (
          <div style={S.sidebar}>

            {/* Sidebar header */}
            <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>Course Content</p>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ color:'rgba(200,220,215,0.45)', fontSize:12 }}>{completedLessons.length}/{totalLessons} lessons</span>
                <span style={{ color:'rgba(200,220,215,0.45)', fontSize:12 }}>{progressPct}% complete</span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:3, background:'rgba(255,255,255,0.07)', flexShrink:0 }}>
              <div style={{ height:'100%', background:'#4a9b8e', width:`${progressPct}%`, transition:'width 0.5s' }} />
            </div>

            {/* Sections */}
            {course.sections?.length > 0 ? course.sections.map(section => {
              const secDone  = section.lessons?.filter(l => completedLessons.includes(l.id)).length || 0;
              const secTotal = section.lessons?.length || 0;
              const isOpen   = expandedSections[section.id];

              return (
                <div key={section.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {/* Section header */}
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                    style={{
                      width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'14px 20px', background:'none', border:'none', cursor:'pointer',
                      textAlign:'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}
                  >
                    <div>
                      <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0 }}>{section.title}</p>
                      <p style={{ color:'rgba(200,220,215,0.4)', fontSize:11, marginTop:3 }}>
                        {secDone}/{secTotal} · {section.duration || ''}
                      </p>
                    </div>
                    {isOpen
                      ? <ChevronUp   size={15} color="rgba(200,220,215,0.4)" />
                      : <ChevronDown size={15} color="rgba(200,220,215,0.4)" />
                    }
                  </button>

                  {/* Lessons */}
                  {isOpen && section.lessons?.map(lesson => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isActive    = activeLesson?.id === lesson.id;
                    const canWatch    = canWatchLesson(lesson);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => selectLesson(lesson)}
                        disabled={!canWatch}
                        style={{
                          width:'100%', display:'flex', alignItems:'flex-start', gap:12,
                          padding:'10px 20px', background: isActive ? 'rgba(74,155,142,0.1)' : 'none',
                          border:'none',
                          borderLeft: isActive ? '3px solid #4a9b8e' : '3px solid transparent',
                          cursor: canWatch ? 'pointer' : 'not-allowed',
                          opacity: canWatch ? 1 : 0.4,
                          textAlign:'left', transition:'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive && canWatch) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='none'; }}
                      >
                        {/* Circle icon */}
                        <div style={{
                          flexShrink:0, marginTop:2,
                          width:18, height:18, borderRadius:'50%',
                          border: `2px solid ${isCompleted ? '#4a9b8e' : isActive ? '#4a9b8e' : 'rgba(200,220,215,0.25)'}`,
                          background: isCompleted ? '#4a9b8e' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {isCompleted ? (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          ) : canWatch ? (
                            <Play size={7} color={isActive ? '#4a9b8e' : 'rgba(200,220,215,0.5)'} fill={isActive ? '#4a9b8e' : 'rgba(200,220,215,0.5)'} style={{ marginLeft:1 }} />
                          ) : (
                            <Lock size={7} color="rgba(200,220,215,0.4)" />
                          )}
                        </div>

                        {/* Text */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{
                            margin:0, fontSize:13, fontWeight: isActive ? 600 : 500, lineHeight:1.4,
                            color: isActive ? '#4a9b8e' : isCompleted ? 'rgba(200,220,215,0.7)' : 'rgba(200,220,215,0.85)',
                          }}>
                            {lesson.title}
                            {lesson.free && (
                              <span style={{ marginLeft:8, color:'#4ade80', fontSize:10, fontWeight:700, border:'1px solid rgba(74,222,128,0.3)', padding:'1px 6px', borderRadius:3 }}>
                                Free
                              </span>
                            )}
                          </p>
                          <p style={{ margin:'3px 0 0', color:'rgba(200,220,215,0.35)', fontSize:11 }}>{lesson.duration || ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            }) : (
              <div style={{ padding:48, textAlign:'center', color:'rgba(200,220,215,0.3)', fontSize:13 }}>
                No lessons added yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePlayerPage;
