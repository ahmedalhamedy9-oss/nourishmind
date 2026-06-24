import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Volume2, VolumeX } from 'lucide-react';
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
    u.searchParams.set('preload',  'true');
    u.searchParams.set('responsive', 'false');
    return u.toString();
  } catch { return url; }
};

/**
 * CourseCard — Portrait 2:3 MasterClass-style
 * • pop-out on hover (scale + translateY)
 * • gradient overlay with title + meta at bottom
 * • Netflix-style preview video on hover (Bunny Stream)
 * • badge (New / CME / etc.) top-left
 * • top-10 ghost number option
 * • wishlist heart
 */
const CourseCard = ({ course, rank }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // ── Wishlist ──
  const [wishlisted,   setWishlisted]   = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    if (!currentUser || !course?.id) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => { if (snap.exists()) setWishlisted((snap.data().wishlist || []).includes(course.id)); })
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

  // ── Preview video (Bunny) ──
  const [showIframe, setShowIframe] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [muted,      setMuted]      = useState(true);
  const [iframeSrc,  setIframeSrc]  = useState('');

  const hoverRef   = useRef(false);
  const hoverTimer = useRef(null);
  const videoTimer = useRef(null);
  const isMobile   = typeof window !== 'undefined' && window.innerWidth < 768;
  const hasBunny   = !!course.previewVideo;

  const handleMouseEnter = () => {
    if (isMobile) return;
    hoverRef.current = true;
    if (!hasBunny) return;
    hoverTimer.current = setTimeout(() => {
      if (hoverRef.current) {
        setIframeSrc(getBunnyUrl(course.previewVideo, false));
        setShowIframe(true);
      }
    }, 1500);
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
      if (hoverRef.current) { setVideoReady(true); setShowVideo(true); }
    }, 1500);
  };

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const newMuted = !muted;
    setMuted(newMuted);
    setIframeSrc(getBunnyUrl(course.previewVideo, newMuted));
  }, [muted, course.previewVideo]);

  // ── Top-10 layout ──
  if (rank) {
    return (
      <div
        className="relative flex-shrink-0 cursor-pointer group"
        style={{ width: '190px', paddingLeft: '52px' }}
        onClick={() => navigate(`/course/${course.id}`)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Ghost number */}
        <span style={{
          position: 'absolute', bottom: '8px', left: 0,
          fontSize: '120px', lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(255,255,255,0.15)',
          fontFamily: 'Georgia, serif', fontWeight: 900,
          userSelect: 'none', pointerEvents: 'none', zIndex: 0,
        }}>
          {rank}
        </span>
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            aspectRatio: '2/3', zIndex: 1,
            boxShadow: showVideo ? '0 20px 50px rgba(0,0,0,0.8)' : '0 8px 28px rgba(0,0,0,0.5)',
            transform: showVideo ? 'scale(1.08) translateY(-10px)' : 'scale(1)',
            transition: 'all 0.35s cubic-bezier(0.2,0,0.2,1)',
          }}
        >
          {/* Bunny iframe */}
          {showIframe && hasBunny && (
            <iframe
              src={iframeSrc}
              className="absolute inset-0 w-full h-full border-0"
              style={{ zIndex: 1, pointerEvents: 'none' }}
              allow="autoplay; encrypted-media"
              onLoad={onIframeLoad}
            />
          )}
          {/* Thumbnail */}
          <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: showVideo ? 0 : 1, zIndex: 2 }}>
            {course.image
              ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: 'hsl(var(--primary) / 0.2)' }} />
            }
          </div>
          {/* Overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 55%)',
            zIndex: 3, pointerEvents: 'none'
          }} />
          {/* Badge */}
          {course.new && (
            <span className="absolute top-2 left-2" style={{
              background: 'hsl(var(--primary))', color: '#000',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', padding: '2px 8px', borderRadius: '3px', zIndex: 4
            }}>New</span>
          )}
          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 p-3" style={{ zIndex: 4 }}>
            <p className="text-white font-bold line-clamp-2" style={{ fontSize: '0.78rem' }}>{course.title}</p>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
              {course.price ? `$${course.price}` : 'Free'}
            </p>
          </div>
          {/* Mute */}
          {showVideo && (
            <button onClick={toggleMute} className="absolute bottom-2 right-2" style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, cursor: 'pointer'
            }}>
              {muted ? <VolumeX size={12} color="#fff" /> : <Volume2 size={12} color="#fff" />}
            </button>
          )}
          {/* Wishlist */}
          <button onClick={toggleWishlist} disabled={wishlistBusy} style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 5,
            width: '26px', height: '26px', borderRadius: '50%',
            background: wishlisted ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Heart size={11} color="#fff" fill={wishlisted ? '#fff' : 'none'} />
          </button>
        </div>
      </div>
    );
  }

  // ── Standard portrait card ──
  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: '190px' }}
      onClick={() => navigate(`/course/${course.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          aspectRatio: '2/3',
          boxShadow: showVideo
            ? '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px hsl(var(--primary) / 0.4)'
            : '0 8px 28px rgba(0,0,0,0.5)',
          transform: showVideo ? 'scale(1.1) translateY(-12px)' : 'scale(1)',
          transition: 'all 0.35s cubic-bezier(0.2,0,0.2,1)',
          zIndex: showVideo ? 10 : 1,
        }}
      >
        {/* Bunny iframe */}
        {showIframe && hasBunny && (
          <iframe
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-0"
            style={{ zIndex: 1, pointerEvents: 'none' }}
            allow="autoplay; encrypted-media"
            onLoad={onIframeLoad}
          />
        )}

        {/* Thumbnail */}
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: showVideo ? 0 : 1, zIndex: 2 }}>
          {course.image
            ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: 'hsl(var(--primary) / 0.2)' }} />
          }
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.1) 55%)',
          zIndex: 3, pointerEvents: 'none'
        }} />

        {/* Badge */}
        {(course.new || course.badge) && (
          <span className="absolute top-2 left-2" style={{
            background: 'hsl(var(--primary))', color: '#000',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', padding: '2px 8px', borderRadius: '3px', zIndex: 4
          }}>
            {course.badge || 'New'}
          </span>
        )}

        {/* Card info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ zIndex: 4 }}>
          <p className="text-white font-bold line-clamp-2" style={{ fontSize: '0.82rem', lineHeight: 1.3 }}>
            {course.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              {course.instructor || 'NourishMind'}
            </p>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>
              {course.price ? `$${course.price}` : <span style={{ color: '#4ade80' }}>Free</span>}
            </p>
          </div>
        </div>

        {/* Mute button */}
        {showVideo && (
          <button onClick={toggleMute} className="absolute bottom-2 right-2" style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, cursor: 'pointer'
          }}>
            {muted ? <VolumeX size={12} color="#fff" /> : <Volume2 size={12} color="#fff" />}
          </button>
        )}

        {/* Wishlist */}
        <button onClick={toggleWishlist} disabled={wishlistBusy} style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 5,
          width: '26px', height: '26px', borderRadius: '50%',
          background: wishlisted ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Heart size={11} color="#fff" fill={wishlisted ? '#fff' : 'none'} />
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
