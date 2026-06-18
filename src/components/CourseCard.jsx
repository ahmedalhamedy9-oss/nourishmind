import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Bookmark } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const getBunnyUrl = (url) => {
  if (!url) return null;
  try {
    // convert player URL to embed URL
    url = url.replace('player.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/');
    const u = new URL(url);
    u.searchParams.set('autoplay', 'true');
    u.searchParams.set('muted', 'false');
    u.searchParams.set('loop', 'true');
    u.searchParams.set('controls', 'false');
    return u.toString();
  } catch { return url; }
};

const CourseCard = ({ course }) => {
  const navigate = useNavigate();
  const [videoReady, setVideoReady] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const hoverRef = useRef(false);
  const timerRef = useRef(null);
  const { isAr } = useLanguage();
  const hasBunny = !!course.previewVideo;

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (!hasBunny) return;
    timerRef.current = setTimeout(() => {
      if (hoverRef.current) setVideoReady(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    clearTimeout(timerRef.current);
    setVideoReady(false);
    setIframeLoaded(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-[300px] cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/course/${course.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card mb-3 shadow-md group-hover:shadow-xl transition-shadow">
        {course.image && (
          <img src={course.image} alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: videoReady && iframeLoaded ? 0 : 1 }}
          />
        )}
        {!course.image && <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />}

        {videoReady && hasBunny && (
          <iframe src={getBunnyUrl(course.previewVideo)}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-500"
            style={{ opacity: iframeLoaded ? 1 : 0 }}
            allow="autoplay; encrypted-media"
            title={course.title}
            onLoad={() => setIframeLoaded(true)}
          />
        )}

        {course.new && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase z-10">New</span>
        )}
        {course.level && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-sm z-10">{course.level}</span>
        )}
      </div>

      {/* Course info */}
      <div className={`px-1 ${isAr ? 'text-right' : 'text-left'}`}>
        <p className="text-primary text-[10px] font-bold uppercase tracking-wide mb-1">{course.category}</p>
        <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          {course.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {course.rating.toFixed(1)}
              {course.students_count && <span className="text-gray-500">({course.students_count >= 1000 ? `${(course.students_count/1000).toFixed(1)}K` : course.students_count})</span>}
            </span>
          )}
          {course.duration_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_hours}h</span>}
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
