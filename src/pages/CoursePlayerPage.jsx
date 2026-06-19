import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle, Circle, Lock, Play, List,
  ChevronDown, ChevronUp, SkipForward, SkipBack, BookOpen,
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';

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

const CoursePlayerPage = () => {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { currentUser }  = useAuth();
  const { courses }      = useCourses();
  const course           = courses.find(c => c.id === id);

  const [activeLesson,     setActiveLesson]     = useState(null);
  const [autoplayNext,     setAutoplayNext]      = useState(false);
  const [completedLessons, setCompletedLessons]  = useState([]);
  const [showSidebar,      setShowSidebar]       = useState(true);
  const [expandedSections, setExpandedSections]  = useState({});
  const [isEnrolled,       setIsEnrolled]        = useState(false);
  const iframeKey = useRef(0);

  /* expand sections + set first lesson */
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

  /* load user progress */
  useEffect(() => {
    if (!currentUser || !course) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        setIsEnrolled(data.enrolledCourses?.includes(id) || false);
        setCompletedLessons(data.progress?.[id + '_completed'] || []);
        const lastId = data.progress?.[id + '_lastLesson'];
        if (lastId && course.sections) {
          for (const section of course.sections) {
            const found = section.lessons?.find(l => l.id === lastId);
            if (found) { setActiveLesson(found); setAutoplayNext(true); break; }
          }
        }
      } catch (_) {}
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
  };

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
    const pct = Math.round((newCompleted.length / (allLessons.length || 1)) * 100);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ['progress.' + id + '_completed']:  newCompleted,
        ['progress.' + id + '_lastLesson']: lesson.id,
        ['progress.' + id]:                 pct,
      });
    } catch (_) {}
  };

  const totalLessons  = allLessons.length;
  const progressPct   = totalLessons ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const activeSection = course?.sections?.find(s => s.lessons?.some(l => l.id === activeLesson?.id));

  if (!course) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'system-ui' }}>
      Course not found
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#0f1117', fontFamily:'system-ui, sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:56, background:'#131720', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button
            onClick={() => navigate('/course/' + id)}
            style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(200,220,215,0.7)', background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:500, padding:0 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:16 }}>
            <p style={{ color:'rgba(200,220,215,0.45)', fontSize:11, lineHeight:1, margin:0 }}>{course.category || course.title}</p>
            <p style={{ color:'#fff', fontWeight:600, fontSize:14, marginTop:3, lineHeight:1, margin:0 }}>
              {activeLesson?.title || 'Select a lesson'}
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:160, height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'#4a9b8e', borderRadius:3, width: progressPct + '%', transition:'width 0.5s' }} />
            </div>
            <span style={{ color:'rgba(200,220,215,0.6)', fontSize:12, fontWeight:500, minWidth:32 }}>{progressPct}%</span>
          </div>
          <button
            onClick={() => setShowSidebar(s => !s)}
            style={{
              display:'flex', alignItems:'center', gap:8,
              color: showSidebar ? '#4a9b8e' : 'rgba(200,220,215,0.7)',
              background: showSidebar ? 'rgba(74,155,142,0.1)' : 'transparent',
              border: '1px solid ' + (showSidebar ? 'rgba(74,155,142,0.4)' : 'rgba(255,255,255,0.12)'),
              borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer',
            }}
          >
            <List size={15} /> Lessons
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* VIDEO COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0 }}>

          {/* Player */}
          <div style={{ position:'relative', background:'#000', flexShrink:0, aspectRatio:'16/9', maxHeight:'65vh' }}>
            {activeLesson ? (
              canWatch(activeLesson) ? (
                activeLesson.videoUrl ? (
                  <iframe
                    key={iframeKey.current}
                    src={getBunnyEmbedUrl(activeLesson.videoUrl, { autoplay: autoplayNext })}
                    style={{ width:'100%', height:'100%', border:'none', display:'block' }}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    referrerPolicy="origin"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#0a0f0e' }}>
                    <Play size={32} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
                    <p style={{ color:'rgba(200,220,215,0.4)', fontSize:13, margin:0 }}>No video URL for this lesson</p>
                  </div>
                )
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
                  <Lock size={40} color="rgba(74,155,142,0.4)" />
                  <p style={{ color:'#fff', fontWeight:700, fontSize:20, margin:0 }}>Subscribe to Watch</p>
                  <p style={{ color:'rgba(200,220,215,0.5)', fontSize:14, margin:'0 0 8px' }}>This lesson is for enrolled students only</p>
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
                <p style={{ color:'rgba(200,220,215,0.3)', fontSize:14, margin:0 }}>Select a lesson to start</p>
              </div>
            )}
          </div>

          {/* Lesson info */}
          {activeLesson && (
            <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
              <div>
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
              {canWatch(activeLesson) && (
                <button
                  onClick={() => markComplete(activeLesson)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, flexShrink:0,
                    padding:'10px 20px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                    background: completedLessons.includes(activeLesson.id) ? 'rgba(74,155,142,0.15)' : 'transparent',
                    border: '1px solid ' + (completedLessons.includes(activeLesson.id) ? 'rgba(74,155,142,0.5)' : 'rgba(255,255,255,0.15)'),
                    color: completedLessons.includes(activeLesson.id) ? '#4a9b8e' : 'rgba(200,220,215,0.75)',
                    transition:'all 0.2s',
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

          {/* Prev / Next */}
          {activeLesson && (
            <div style={{ display:'flex', gap:12, padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => prevLesson && selectLesson(prevLesson)}
                disabled={!prevLesson || !canWatch(prevLesson)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500,
                  cursor: prevLesson ? 'pointer' : 'not-allowed',
                  background:'transparent', border:'1px solid rgba(255,255,255,0.1)',
                  color: prevLesson ? 'rgba(200,220,215,0.7)' : 'rgba(200,220,215,0.2)',
                }}
              >
                <SkipBack size={13} /> Previous
              </button>
              <button
                onClick={() => nextLesson && selectLesson(nextLesson)}
                disabled={!nextLesson || !canWatch(nextLesson)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500,
                  cursor: nextLesson ? 'pointer' : 'not-allowed',
                  background: nextLesson && canWatch(nextLesson) ? 'rgba(74,155,142,0.12)' : 'transparent',
                  border: '1px solid ' + (nextLesson && canWatch(nextLesson) ? 'rgba(74,155,142,0.35)' : 'rgba(255,255,255,0.1)'),
                  color: nextLesson && canWatch(nextLesson) ? '#4a9b8e' : 'rgba(200,220,215,0.2)',
                }}
              >
                Next <SkipForward size={13} />
              </button>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        {showSidebar && (
          <div style={{ width:340, flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'1px solid rgba(255,255,255,0.08)', background:'#131720', overflowY:'auto' }}>

            <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>Course Content</p>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ color:'rgba(200,220,215,0.45)', fontSize:12 }}>{completedLessons.length}/{totalLessons} lessons</span>
                <span style={{ color:'rgba(200,220,215,0.45)', fontSize:12 }}>{progressPct}% complete</span>
              </div>
            </div>

            <div style={{ height:3, background:'rgba(255,255,255,0.07)', flexShrink:0 }}>
              <div style={{ height:'100%', background:'#4a9b8e', width: progressPct + '%', transition:'width 0.5s' }} />
            </div>

            {course.sections?.length > 0 ? course.sections.map(section => {
              const secDone  = section.lessons?.filter(l => completedLessons.includes(l.id)).length || 0;
              const secTotal = section.lessons?.length || 0;
              const isOpen   = expandedSections[section.id];

              return (
                <div key={section.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                  >
                    <div>
                      <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0 }}>{section.title}</p>
                      <p style={{ color:'rgba(200,220,215,0.4)', fontSize:11, marginTop:3, margin:0 }}>
                        {secDone}/{secTotal}{section.duration ? ' · ' + section.duration : ''}
                      </p>
                    </div>
                    {isOpen
                      ? <ChevronUp   size={15} color="rgba(200,220,215,0.4)" />
                      : <ChevronDown size={15} color="rgba(200,220,215,0.4)" />
                    }
                  </button>

                  {isOpen && section.lessons?.map(lesson => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isActive    = activeLesson?.id === lesson.id;
                    const watchable   = canWatch(lesson);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => selectLesson(lesson)}
                        disabled={!watchable}
                        style={{
                          width:'100%', display:'flex', alignItems:'flex-start', gap:12,
                          padding:'10px 20px',
                          background: isActive ? 'rgba(74,155,142,0.1)' : 'transparent',
                          border:'none',
                          borderLeft: '3px solid ' + (isActive ? '#4a9b8e' : 'transparent'),
                          cursor: watchable ? 'pointer' : 'not-allowed',
                          opacity: watchable ? 1 : 0.4,
                          textAlign:'left',
                        }}
                      >
                        <div style={{
                          flexShrink:0, marginTop:2,
                          width:18, height:18, borderRadius:'50%',
                          border: '2px solid ' + (isCompleted || isActive ? '#4a9b8e' : 'rgba(200,220,215,0.25)'),
                          background: isCompleted ? '#4a9b8e' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {isCompleted ? (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          ) : watchable ? (
                            <Play size={7} color={isActive ? '#4a9b8e' : 'rgba(200,220,215,0.5)'} fill={isActive ? '#4a9b8e' : 'rgba(200,220,215,0.5)'} style={{ marginLeft:1 }} />
                          ) : (
                            <Lock size={7} color="rgba(200,220,215,0.4)" />
                          )}
                        </div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight: isActive ? 600 : 500, lineHeight:1.4, color: isActive ? '#4a9b8e' : isCompleted ? 'rgba(200,220,215,0.7)' : 'rgba(200,220,215,0.85)' }}>
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
