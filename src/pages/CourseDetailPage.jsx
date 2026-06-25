import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Lock, ChevronDown, ChevronUp, Heart, CheckCircle, RotateCcw } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseRow from '@/components/CourseRow';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';

const DEFAULT_WHAT_YOU_GET = [
  'Expert-led video lessons',
  'Certificate of completion',
  'Lifetime access',
  'Mobile & desktop access',
];

const getBunnyEmbedUrl = (url, opts = {}) => {
  if (!url) return null;
  try {
    let embedUrl = url
      .replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/')
      .replace('player.mediadelivery.net/embed/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(embedUrl);
    u.searchParams.set('autoplay', opts.autoplay !== false ? 'true' : 'false');
    u.searchParams.set('muted',    opts.muted    !== false ? 'true' : 'false');
    u.searchParams.set('controls', opts.controls !== false ? 'true' : 'false');
    return u.toString();
  } catch { return url; }
};

/* ─────────────────────────────────────────
   FLIP CARD COMPONENT
   Front: رقم + عنوان + صورة خلفية
   Back:  وصف تفصيلي
───────────────────────────────────────── */
const FlipCard = ({ item, index }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      style={{
        cursor: 'pointer',
        /* 
          Fixed height on mobile so cards don't get too tall.
          On desktop auto height via aspect-ratio.
        */
        height: '200px',
        perspective: '1000px',
        borderRadius: '14px',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* ── tap hint badge — always visible on front ── */}
      {!flipped && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '20px', padding: '3px 9px',
          display: 'flex', alignItems: 'center', gap: '4px',
          pointerEvents: 'none',
        }}>
          <RotateCcw size={9} color="rgba(255,255,255,0.7)" />
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap' }}>اضغط</span>
        </div>
      )}

      {/* Flip container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        borderRadius: '14px',
      }}>

        {/* ── FRONT ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {/* Background */}
          {item.image
            ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--primary)/0.45) 0%, hsl(var(--primary)/0.12) 100%)' }} />
          }
          {/* Dark overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.72) 100%)',
          }} />

          {/* Number badge */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'hsl(var(--primary))', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {index + 1}
          </div>

          {/* Title — bottom of card */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 14px',
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display','Georgia',serif",
              fontSize: 'clamp(0.82rem, 3.5vw, 1rem)',
              fontWeight: 900, color: '#fff', lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {item.title}
            </h3>
          </div>
        </div>

        {/* ── BACK ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          background: 'linear-gradient(135deg, #0d2018 0%, #0a1412 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px',
        }}>
          {/* Number + title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              background: 'hsl(var(--primary))', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.68rem', fontWeight: 800, marginTop: '1px',
            }}>
              {index + 1}
            </div>
            <h3 style={{
              fontFamily: "'Playfair Display','Georgia',serif",
              fontSize: 'clamp(0.75rem, 3vw, 0.9rem)',
              fontWeight: 900, color: 'hsl(var(--primary))', lineHeight: 1.2,
            }}>
              {item.title}
            </h3>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '10px', flexShrink: 0 }} />

          {/* Description — scrollable if too long */}
          <p style={{
            fontSize: 'clamp(0.72rem, 2.8vw, 0.82rem)',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.6,
            flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}>
            {item.description || 'ستتعلم في هذا الجزء أهم المهارات والمعلومات المرتبطة بهذا الموضوع.'}
          </p>

          {/* Back hint */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            marginTop: '8px', flexShrink: 0,
          }}>
            <RotateCcw size={9} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>اضغط للعودة</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   SKILLS SECTION  (grid of flip cards)
───────────────────────────────────────── */
const SkillsSection = ({ skillItems, onViewLessonPlan }) => (
  <section style={{ padding: '60px 20px 0' }}>
    <style>{`
      .skills-flip-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      @media (min-width: 480px) {
        .skills-flip-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
      }
      @media (min-width: 768px) {
        .skills-flip-grid {
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .skills-section-wrap { padding: 80px 48px 0 !important; }
      }
    `}</style>

    {/* Header */}
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{
        fontFamily: "'Playfair Display','Georgia',serif",
        fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
        fontWeight: 900, color: '#fff', marginBottom: '6px',
      }}>
        Skills You'll Learn
      </h2>
      <button
        onClick={onViewLessonPlan}
        style={{
          background: 'none', border: 'none', color: 'hsl(var(--primary))',
          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        View lesson plan
      </button>
    </div>

    {/* Grid */}
    <div className="skills-flip-grid">
      {skillItems.map((item, i) => (
        <FlipCard key={i} item={item} index={i} />
      ))}
    </div>
  </section>
);

/* ─────────────────────────────────────────
   SECTION LIST
───────────────────────────────────────── */
const SectionList = ({ course, expandedSections, setExpandedSections, navigate }) => (
  <>
    {course.sections?.length > 0 ? course.sections.map(section => (
      <div key={section.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.83rem' }}>{section.title}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '2px' }}>
              {section.lessons?.length || 0} lessons{section.duration ? ' · ' + section.duration : ''}
            </p>
          </div>
          {expandedSections[section.id]
            ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
            : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
          }
        </button>
        {expandedSections[section.id] && section.lessons?.map(lesson => (
          <button key={lesson.id}
            onClick={() => lesson.free && navigate(`/course/${course.id}/learn`)}
            disabled={!lesson.free}
            style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 20px 10px 32px', background: 'none', border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              cursor: lesson.free ? 'pointer' : 'default',
              opacity: lesson.free ? 1 : 0.45, textAlign: 'left',
            }}>
            <div style={{
              flexShrink: 0, marginTop: '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              border: `1px solid ${lesson.free ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {lesson.free
                ? <Play size={7} color="hsl(var(--primary))" fill="hsl(var(--primary))" style={{ marginLeft: '1px' }} />
                : <Lock size={7} color="rgba(255,255,255,0.3)" />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', color: lesson.free ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                {lesson.title}
                {lesson.free && (
                  <span style={{
                    marginLeft: '6px', fontSize: '0.6rem', color: '#4ade80',
                    border: '1px solid rgba(74,222,128,0.3)', padding: '1px 5px', borderRadius: '3px',
                  }}>Free</span>
                )}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{lesson.duration}</p>
            </div>
          </button>
        ))}
      </div>
    )) : (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
        No lessons added yet
      </div>
    )}
  </>
);

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, loading: coursesLoading } = useCourses();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const course = courses.find(c => c.id === id);

  const [expandedSections,  setExpandedSections]  = useState({});
  const [showCurriculum,    setShowCurriculum]    = useState(false);
  const [wishlisted,        setWishlisted]        = useState(false);
  const [wishlistBusy,      setWishlistBusy]      = useState(false);
  const [defaultWhatYouGet, setDefaultWhatYouGet] = useState(DEFAULT_WHAT_YOU_GET);
  const [activeVideoTab,    setActiveVideoTab]    = useState('trailer');
  const [stickyCtaVisible,  setStickyCtaVisible]  = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !id) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => { if (snap.exists()) setWishlisted((snap.data().wishlist || []).includes(id)); })
      .catch(() => {});
  }, [currentUser, id]);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'coursepage'))
      .then(snap => {
        if (snap.exists() && snap.data().default_what_you_get) {
          const lines = snap.data().default_what_you_get.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length) setDefaultWhatYouGet(lines);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      setStickyCtaVisible(heroRef.current.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleWishlist = async (e) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      const current = snap.exists() ? (snap.data().wishlist || []) : [];
      const updated = wishlisted ? current.filter(x => x !== id) : [...current, id];
      await updateDoc(doc(db, 'users', currentUser.uid), { wishlist: updated });
      setWishlisted(!wishlisted);
    } catch (_) {}
    finally { setWishlistBusy(false); }
  };

  if (coursesLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!course) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '12px' }}>Course not found</p>
        <button onClick={() => navigate('/courses')} style={{ color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>← Back to courses</button>
      </div>
    </div>
  );

  const totalLessons   = course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;
  const freeLessons    = course.sections?.reduce((acc, s) => acc + (s.lessons?.filter(l => l.free).length || 0), 0) || 0;
  const categoryLabel  = categories.find(c => c.id === course.category)?.label || course.category || '';
  const outcomes       = course.outcomes || [];
  const skillItems     = (course.skill_items?.length
    ? course.skill_items
    : outcomes.map(o => ({ title: o, description: '', image: course.image }))
  ).slice(0, 8);
  const relatedCourses = courses.filter(c => c.id !== id && c.category === course.category).slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter','Outfit',sans-serif" }}>
      <Header />

      {/* ══ 1. HERO ══ */}
      <section ref={heroRef} className="cp-hero" style={{ display: 'flex', minHeight: '92vh', paddingTop: '64px' }}>
        <div className="cp-hero-img" style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
          {course.image
            ? <img src={course.image} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--primary)/0.3), transparent)' }} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 55%, #0a0a0f 100%), linear-gradient(to top, #0a0a0f 0%, transparent 25%)' }} />
        </div>

        <div className="cp-hero-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 52px 60px 44px', background: '#0a0a0f' }}>
          <p style={{ color: 'hsl(var(--primary))', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>
            {categoryLabel}{course.accredited ? ' · CME Accredited' : ''}
          </p>
          <h1 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 900, lineHeight: 1.05, color: '#fff', marginBottom: '10px' }}>
            {course.title}
          </h1>
          {course.instructor && (
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px', fontStyle: 'italic' }}>
              With {course.instructor}
            </p>
          )}
          {course.description && (
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '430px' }}>
              {course.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
            {totalLessons > 0 && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{totalLessons} Lessons</span>}
            {course.duration_hours && (
              <><span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{course.duration_hours}h</span></>
            )}
            {course.previewVideo && (
              <><span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <button onClick={() => document.getElementById('trailer-section')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Watch Trailer
              </button></>
            )}
          </div>

          {/* Price box */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '14px', padding: '22px', maxWidth: '360px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Enroll in this course</p>
            <p style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '16px' }}>
              {course.price
                ? <>{`$${course.price}`} <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit', fontWeight: 400 }}>/ lifetime</span></>
                : <span style={{ color: '#4ade80' }}>Free</span>
              }
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate(`/course/${course.id}/learn`)}
                style={{ flex: 1, background: 'hsl(var(--primary))', color: '#000', border: 'none', cursor: 'pointer', padding: '13px', borderRadius: '8px', fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <Play size={15} fill="black" />
                {currentUser ? 'Start Learning' : 'Enroll Now'}
              </button>
              <button onClick={toggleWishlist} disabled={wishlistBusy}
                style={{ width: '46px', background: wishlisted ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${wishlisted ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={16} color={wishlisted ? '#ef4444' : 'rgba(255,255,255,0.5)'} fill={wishlisted ? '#ef4444' : 'none'} />
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>30-day money-back guaranteed</p>
          </div>
        </div>
      </section>

      {/* ══ 2. FLIP SKILL CARDS ══ */}
      {skillItems.length > 0 && (
        <SkillsSection
          skillItems={skillItems}
          onViewLessonPlan={() => setShowCurriculum(true)}
        />
      )}

      {/* ══ 3. TRAILER ══ */}
      {course.previewVideo && (
        <section id="trailer-section" style={{ padding: '80px 48px 0' }}>
          <h2 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '24px' }}>
            Watch the Trailer
          </h2>
          <div className="cp-trailer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', alignItems: 'start' }}>
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
              {activeVideoTab === 'trailer' && course.previewVideo ? (
                <iframe src={getBunnyEmbedUrl(course.previewVideo, { autoplay: true, muted: false, controls: true })}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Course Trailer" />
              ) : course.sampleVideo ? (
                <iframe src={getBunnyEmbedUrl(course.sampleVideo, { autoplay: true, muted: false, controls: true })}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Course Sample" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No sample available</p>
                </div>
              )}
              <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '16px', zIndex: 5 }}>
                {['trailer', 'sample'].map(tab => (
                  <button key={tab} onClick={() => setActiveVideoTab(tab)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeVideoTab === tab ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: '0.88rem', fontWeight: 700, textTransform: 'capitalize', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate(`/course/${course.id}/learn`)}>
                {course.image
                  ? <img src={course.image} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'hsl(var(--primary)/0.2)' }} />
                }
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <span style={{ display: 'inline-block', background: 'hsl(var(--primary))', color: '#000', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', marginBottom: '10px' }}>Free Sample</span>
                <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: '4px', lineHeight: 1.3 }}>
                  {course.sections?.[0]?.lessons?.[0]?.title || `Lesson 1: Introduction`}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  {course.sections?.[0]?.lessons?.[0]?.duration || ''} · Module 1
                </p>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <button onClick={() => navigate(`/course/${course.id}/learn`)}
                  style={{ width: '100%', background: 'hsl(var(--primary))', color: '#000', border: 'none', cursor: 'pointer', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem' }}>
                  {currentUser ? 'Start Learning' : 'Enroll to Watch Full Course'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', padding: '0 16px 16px' }}>
                {course.price ? `$${course.price} · Lifetime access` : 'Free · Lifetime access'}
                {course.accredited ? ' · CME Accredited' : ''}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══ 4. RELATED COURSES ══ */}
      {relatedCourses.length > 0 && (
        <section style={{ padding: '80px 0 0' }}>
          <CourseRow title="From Here, Go Anywhere" courses={relatedCourses} seeAllPath="/courses" />
        </section>
      )}

      {/* ══ 5. OUTCOMES ══ */}
      {outcomes.length > 0 && (
        <section style={{ padding: '80px 48px 0' }}>
          <h2 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '28px', textAlign: 'center' }}>
            What You'll Learn
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '12px', maxWidth: '860px', margin: '0 auto' }}>
            {outcomes.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px' }}>
                <CheckCircle size={16} color="hsl(var(--primary))" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ 6. CURRICULUM ══ */}
      {totalLessons > 0 && (
        <section style={{ padding: '80px 48px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>Course Content</h2>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{totalLessons} lessons · {freeLessons} free previews</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', maxWidth: '720px' }}>
            <SectionList course={course} expandedSections={expandedSections} setExpandedSections={setExpandedSections} navigate={navigate} />
          </div>
        </section>
      )}

      {/* ══ 7. CERTIFICATES BANNER ══ */}
      <section className="cp-cert-banner" style={{ margin: '80px 48px 0', display: 'flex', borderRadius: '16px', overflow: 'hidden', minHeight: '260px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg,#1a1f0a 0%,#141a08 100%)', padding: '48px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
            NourishMind <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem', letterSpacing: '2px', marginTop: '2px' }}>CERTIFICATES</strong>
          </p>
          <h2 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '10px' }}>
            The Fastest Way to<br />Advance Your Career
          </h2>
          <p style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.55)', marginBottom: '22px' }}>
            Proof you've trained with the Arab world's leading nutritional psychiatrist.
          </p>
          <button onClick={() => navigate(`/course/${course.id}/learn`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#c8ff00', color: '#000', border: 'none', cursor: 'pointer', padding: '11px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '0.87rem', alignSelf: 'flex-start' }}>
            Get Certified →
          </button>
        </div>
        <div style={{ width: '40%', position: 'relative', overflow: 'hidden' }}>
          {course.image
            ? <img src={course.image} alt="Certificate" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--primary)/0.2), transparent)' }} />
          }
        </div>
      </section>

      {/* ══ 8. CTA BANNER ══ */}
      <section style={{ margin: '80px 48px 80px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', minHeight: '300px' }}>
        {course.instructor_image && (
          <div className="cp-cta-banner-img" style={{ width: '300px', flexShrink: 0, marginTop: '-40px', marginBottom: '-40px', marginLeft: '20px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <img src={course.instructor_image} alt={course.instructor} style={{ width: '100%', height: '360px', objectFit: 'cover', objectPosition: 'top', display: 'block', borderRadius: '12px' }} />
          </div>
        )}
        <div className="cp-cta-banner-info" style={{ flex: 1, padding: '48px 48px' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '10px' }}>NourishMind · at Work</p>
          <h2 style={{ fontFamily: "'Playfair Display','Georgia',serif", fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '14px' }}>
            Level Up Your<br />Medical Team
          </h2>
          <p style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '360px' }}>
            See why leading hospitals and medical organizations rely on NourishMind for continuous medical education.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/course/${course.id}/learn`)}
              style={{ background: 'hsl(var(--primary))', color: '#000', border: 'none', cursor: 'pointer', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
              Enroll Now{course.price ? ` — $${course.price}` : ''}
            </button>
            <button onClick={() => navigate('/courses')}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
              Browse All →
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* ══ STICKY BOTTOM CTA ══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.96)', borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px clamp(16px,4vw,48px)', backdropFilter: 'blur(8px)',
        transform: stickyCtaVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{course.title}</p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              {totalLessons} lessons{course.accredited ? ' · CME Accredited' : ''} · Lifetime Access
            </p>
          </div>
          <button onClick={() => navigate(`/course/${course.id}/learn`)}
            style={{ background: 'hsl(var(--primary))', color: '#000', border: 'none', cursor: 'pointer', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
            {course.price ? `Enroll Now — $${course.price}` : 'Start Free'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
