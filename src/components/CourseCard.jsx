import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Volume2, VolumeX, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getBunnyUrl = (url, muted = true) => {
  if (!url) return null;
  try {
    let embedUrl = url
      .replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/')
      .replace('player.mediadelivery.net/embed/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(embedUrl);
    u.searchParams.set('autoplay', 'true');
    u.searchParams.set('muted',    muted ? 'true' : 'false');
    u.searchParams.set('loop',     'true');
    u.searchParams.set('controls', 'false');
    return u.toString();
  } catch { return url; }
};

const CourseCard = ({ course }) => {
  const navigate  = useNavigate();
  const { isAr } = useLanguage();
  const { currentUser } = useAuth();
  const [wishlisted,   setWishlisted]   = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    if (!currentUser || !course?.id) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => { if (snap.exists()) setWishlisted((snap.data().wishlist||[]).includes(course.id)); })
      .catch(() => {});
  }, [currentUser, course?.id]);

  const toggleWishlist = async (e) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      const current = snap.exists() ? (snap.data().wishlist || []) : [];
      const updated = wishlisted ? current.filter(x => x !== course.id) : [...current, course.id];
      await updateDoc(doc(db, 'users', currentUser.uid), { wishlist: updated });
      setWishlisted(!wishlisted);
    } catch (_) {}
    finally { setWishlistBusy(false); }
  };

  const [showIframe,   setShowIframe]   = useState(false);
  const [videoReady,   setVideoReady]   = useState(false);
  const [showVideo,    setShowVideo]    = useState(false);
  const [muted,        setMuted]        = useState(true);
  const [iframeSrc,    setIframeSrc]    = useState('');

  const iframeRef  = useRef(null);
  const hoverRef   = useRef(false);
  const hoverTimer = useRef(null);
  const videoTimer = useRef(null);

  const hasBunny = !!course.previewVideo;

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (!hasBunny) return;
    hoverTimer.current = setTimeout(() => {
      if (hoverRef.current) {
        setIframeSrc(getBunnyUrl(course.previewVideo, true));
        setShowIframe(true);
      }
    }, 600);
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    clearTimeout(hoverTimer.current);
    clearTimeout(videoTimer.current);
    setShowIframe(false);
    setVideoReady(false);
    setShowVideo(false);
    setMuted(true);
    setIframeSrc('');
  };

  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(videoTimer.current);
  }, []);

  useEffect(() => {
    if (!showIframe) return;
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'play' || data?.event === 'timeupdate') {
          if (hoverRef.current && !videoReady) {
            setVideoReady(true);
            videoTimer.current = setTimeout(() => {
              if (hoverRef.current) setShowVideo(true);
            }, 300);
          }
        }
      } catch (_) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showIframe, videoReady]);

  const onIframeLoad = () => {
    videoTimer.current = setTimeout(() => {
      if (hoverRef.current) {
        setVideoReady(true);
        setShowVideo(true);
      }
    }, 3000);
  };

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const newMuted = !muted;
    setMuted(newMuted);
    setIframeSrc(getBunnyUrl(course.previewVideo, newMuted));
  }, [muted, course.previewVideo]);

  const formattedRating = course.rating ? Number(course.rating).toFixed(1) : null;
  const formattedStudents = course.students_count
    ? course.students_count >= 1000
      ? `${(course.students_count / 1000).toFixed(1)}K`
      : course.students_count
    : null;

  return (
    <article
      className="flex-shrink-0 w-[280px] sm:w-[300px] cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/course/${course.id}`)}
      aria-label={`${course.title}${course.instructor ? ` by ${course.instructor}` : ''}${course.price ? ` — $${course.price}` : ' — Free'}`}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card mb-3 shadow-md group-hover:shadow-xl transition-shadow">

        {showIframe && hasBunny && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            style={{ zIndex: 1 }}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="origin"
            allowFullScreen
            title={`Preview video for ${course.title}`}
            onLoad={onIframeLoad}
          />
        )}

        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ zIndex: 4, opacity: showVideo ? 0 : 1, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {course.image
            ? <img
                src={course.image}
                alt={`${course.title} course thumbnail`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            : null
          }
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" style={{ zIndex: 0 }} />
        </div>

        {showVideo && (
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute preview video' : 'Mute preview video'}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors border border-white/20"
            style={{ zIndex: 10 }}
          >
            {muted
              ? <VolumeX className="w-4 h-4 text-white" aria-hidden="true" />
              : <Volume2 className="w-4 h-4 text-white" aria-hidden="true" />
            }
          </button>
        )}

        <button
          onClick={toggleWishlist}
          disabled={wishlistBusy}
          aria-label={wishlisted ? `Remove ${course.title} from wishlist` : `Save ${course.title} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{
            zIndex: 10,
            background: wishlisted ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Heart size={13} color="#fff" fill={wishlisted ? '#fff' : 'none'} aria-hidden="true" />
        </button>

        {course.new && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase z-10" aria-label="New course">New</span>
        )}
        {course.level && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-sm z-10">{course.level}</span>
        )}
      </div>

      {/* Info */}
      <div className={`px-1 ${isAr ? 'text-right' : 'text-left'}`}>
        {course.category && (
          <p className="text-primary text-[10px] font-bold uppercase tracking-wide mb-1">{course.category}</p>
        )}
        <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          {formattedRating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" aria-hidden="true" />
              <span aria-label={`Rating: ${formattedRating} out of 5`}>{formattedRating}</span>
              {formattedStudents && (
                <span className="text-gray-500" aria-label={`${formattedStudents} students`}>({formattedStudents})</span>
              )}
            </span>
          )}
          {course.duration_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <span aria-label={`Duration: ${course.duration_hours} hours`}>{course.duration_hours}h</span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {course.instructor_image
              ? <img src={course.instructor_image} alt={`${course.instructor} — instructor`} className="w-6 h-6 rounded-full object-cover" loading="lazy" />
              : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold" aria-hidden="true">{course.instructor?.[0] || 'N'}</div>
            }
            <p className="text-gray-400 text-xs truncate max-w-[120px]">{course.instructor || 'NourishMind'}</p>
          </div>
          <span className="text-primary font-bold text-sm" aria-label={course.price ? `Price: $${course.price}` : 'Free'}>
            {course.price ? `$${course.price}` : <span className="text-green-400">Free</span>}
          </span>
        </div>
      </div>
    </article>
  );
};

export default CourseCard;
