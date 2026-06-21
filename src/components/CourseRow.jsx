import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import RevealSection from '@/components/RevealSection';

// Top 10 style card with big number behind
const Top10Card = ({ course, rank }) => {
  const navigate = useNavigate();
  return (
    // paddingLeft reserves space for the number bleeding behind the card
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: '190px', paddingLeft: '50px' }}
      onClick={() => navigate(`/course/${course.id}`)}
    >
      {/* Big rank number — positioned inside padded area, never clipped */}
      <span
        className="absolute bottom-4 font-black select-none pointer-events-none leading-none"
        style={{
          left: '0px',
          fontSize: '110px',
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(255,255,255,0.18)',
          fontFamily: 'Georgia, serif',
          zIndex: 0,
        }}
      >
        {rank}
      </span>
      {/* Card sits to the right of the number */}
      <div className="relative rounded-xl overflow-hidden bg-card border border-border group-hover:border-primary/50 transition-all group-hover:scale-105 duration-300 shadow-lg" style={{ aspectRatio: '2/3', zIndex: 1 }}>
        {course.image
          ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-primary/10" />
        }
        {course.new && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">New</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-white text-xs font-semibold line-clamp-2">{course.title}</p>
        </div>
      </div>
    </div>
  );
};

// Normal card
const NormalCard = ({ course }) => {
  const navigate = useNavigate();
  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: '260px' }}
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <div className="relative rounded-xl overflow-hidden aspect-video bg-card border border-border group-hover:border-primary/40 transition-all duration-300">
        {course.image
          ? <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full bg-primary/10" />
        }
        {course.new && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">New</span>
        )}
        {course.level && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-sm">{course.level}</span>
        )}
      </div>
      <div className="mt-2 px-1">
        <p className="text-white font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{course.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-gray-400 text-xs">{course.instructor}</p>
          <p className="text-primary font-bold text-sm">{course.price ? `$${course.price}` : <span className="text-green-400">Free</span>}</p>
        </div>
      </div>
    </div>
  );
};

// Continue Learning card with progress
const ContinueCard = ({ course, progress = 0 }) => {
  const navigate = useNavigate();
  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: '300px' }}
      onClick={() => navigate(`/course/${course.id}/learn`)}
    >
      <div className="relative rounded-xl overflow-hidden aspect-video bg-card border border-border group-hover:border-primary/40 transition-all duration-300">
        {course.image
          ? <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full bg-primary/10" />
        }
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        {/* Progress label */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
          {progress}%
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-white font-semibold text-sm line-clamp-1">{course.title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{progress === 0 ? 'Not started' : progress === 100 ? '✅ Completed' : `Continue from ${progress}%`}</p>
      </div>
    </div>
  );
};

const CourseRow = ({ title, courses, variant = 'normal', seeAllPath, userProgress = {} }) => {
  const ref = useRef(null);

  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 450, behavior: 'smooth' });
  };

  if (!courses?.length) return null;

  return (
    <div className="mb-10 group/row">
      {/* Header */}
      <div className={"flex items-center gap-3 mb-4 px-4 sm:px-12"}>
        <h2 className="text-white font-bold text-xl">{title}</h2>
        {seeAllPath && (
          <a href={seeAllPath} className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
            Explore All <ChevronRight className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Cards */}
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-0 z-20 w-10 bg-black/70 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/90 hidden sm:flex"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <div
          ref={ref}
          className={`flex gap-4 overflow-x-auto px-4 sm:px-12 pb-4 ${variant === 'top10' ? 'pt-4' : 'pt-2'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {courses.map((course, i) => (
            variant === 'top10'
              ? <Top10Card key={course.id} course={course} rank={i + 1} />
              : variant === 'continue'
              ? <ContinueCard key={course.id} course={course} progress={userProgress[course.id] || 0} />
              : <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-0 z-20 w-10 bg-black/70 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/90 hidden sm:flex"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default CourseRow;
