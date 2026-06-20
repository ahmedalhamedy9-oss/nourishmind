import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Volume2, VolumeX, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getBunnyUrl = (url) => {
  if (!url) return null;
  try {
    let embedUrl = url
      .replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/')
      .replace('player.mediadelivery.net/embed/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(embedUrl);
    u.searchParams.set('autoplay', 'true');
    u.searchParams.set('muted',    'true');
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

  // Load wishlist state for this card
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

  const [showIframe, setShowIframe] = useState(false); // mount iframe in DOM
  const [showVideo,  setShowVideo]  = useState(false); // fade thumbnail out
  const [muted,      setMuted]      = useState(true);

  const iframeRef  = useRef(null);
  const hoverRef   = useRef(false);
  const hoverTimer = useRef(null);
  const videoTimer = useRef(null);

  const hasBunny = !!course.previewVideo;

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (!hasBunny) return;
    hoverTimer.current = setTimeout(() => {
      if (hoverRef.current) setShowIframe(true);
    }, 600);
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    clearTimeout(hoverTimer.current);
    clearTimeout(videoTimer.current);
    setShowIframe(false);
    setShowVideo(false);
    setMuted(true);
  };

  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(videoTimer.current);
  }, []);

  // iframe onLoad → wait 1.2s then reveal video (thumbnail fades out)
  const onIframeLoad = () => {
    videoTimer.current = setTimeout(() => {
      if (hoverRef.current) setShowVideo(true);
    }, 1200);
  };

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const newMuted = !muted;
    setMuted(newMuted);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: newMuted ? 'mute' : 'unmute' }), '*'
      );
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: 'setVolume', value: newMuted ? 0 : 1 }), '*'
      );
    } catch (_) {}
  }, [muted]);

  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-[300px] cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card mb-3 shadow-md group-hover:shadow-xl transition-shadow">

        {/* ── iframe loads silently in background (zIndex 1) ── */}
        {showIframe && hasBunny && (
          <>
            <iframe
              ref={iframeRef}
              src={getBunnyUrl(course.previewVideo)}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              style={{ zIndex: 1 }}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
              allowFullScreen
              title={course.title}
              onLoad={onIframeLoad}
            />
            {/* Cover Bunny's own play button until our thumbnail fades out */}
            {!showVideo && (
              <div
                className="absolute inset-0"
                style={{ zIndex: 3, background: 'transparent', pointerEvents: 'none' }}
              />
            )}
          </>
        )}

        {/* ── Thumbnail stays ON TOP (zIndex 4) and fades away only after video ready ── */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ zIndex: 4, opacity: showVideo ? 0 : 1, pointerEvents: 'none' }}
        >
          {course.image
            ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
          }
        </div>

        {/* ── Mute button (zIndex 10) — only when video is showing ── */}
        {showVideo && (
          <button
            onClick={toggleMute}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors border border-white/20"
            style={{ zIndex: 10 }}
          >
            {muted
              ? <VolumeX className="w-4 h-4 text-white" />
              : <Volume2 className="w-4 h-4 text-white" />
            }
          </button>
        )}

        {/* ── Wishlist button ── */}
        <button
          onClick={toggleWishlist}
          disabled={wishlistBusy}
          title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{
            zIndex: 10,
            background: wishlisted ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Heart size={13} color="#fff" fill={wishlisted ? '#fff' : 'none'} />
        </button>

        {/* ── Badges (always visible, zIndex 10) ── */}
        {course.new && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase z-10">New</span>
        )}
        {course.level && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-sm z-10">{course.level}</span>
        )}
      </div>

      {/* Info */}
      <div className={`px-1 ${isAr ? 'text-right' : 'text-left'}`}>
        <p className="text-primary text-[10px] font-bold uppercase tracking-wide mb-1">{course.category}</p>
        <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          {course.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {Number(course.rating).toFixed(1)}
              {course.students_count && (
                <span className="text-gray-500">
                  ({course.students_count >= 1000
                    ? `${(course.students_count / 1000).toFixed(1)}K`
                    : course.students_count})
                </span>
              )}
            </span>
          )}
          {course.duration_hours && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_hours}h</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {course.instructor_image
              ? <img src={course.instructor_image} alt={course.instructor} className="w-6 h-6 rounded-full object-cover" />
              : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">{course.instructor?.[0] || 'N'}</div>
            }
            <p className="text-gray-400 text-xs truncate max-w-[120px]">{course.instructor || 'NourishMind'}</p>
          </div>
          <span className="text-primary font-bold text-sm">
            {course.price ? `$${course.price}` : <span className="text-green-400">Free</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;

