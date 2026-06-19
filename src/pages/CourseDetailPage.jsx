import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Star, Clock, Users, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import Header from '@/components/Header';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';

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

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const course = courses.find(c => c.id === id);
  const [expandedSections, setExpandedSections] = useState({});
  const [showCurriculum, setShowCurriculum] = useState(false);

  if (!course) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-2xl font-bold mb-4">Course not found</p>
        <button onClick={() => navigate('/courses')} className="text-primary hover:underline">← Back</button>
      </div>
    </div>
  );

  const totalLessons  = course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;
  const freeLessons   = course.sections?.reduce((acc, s) => acc + (s.lessons?.filter(l => l.free).length || 0), 0) || 0;
  const categoryLabel = categories.find(c => c.id === course.category)?.label || course.category;

  const SectionList = () => (
    <>
      {course.sections?.length > 0 ? course.sections.map(section => (
        <div key={section.id} className="border-b border-white/10">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors text-left">
            <div>
              <p className="text-white font-semibold text-sm">{section.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{section.lessons?.length || 0} lessons{section.duration ? ' · ' + section.duration : ''}</p>
            </div>
            {expandedSections[section.id]
              ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
          </button>
          {expandedSections[section.id] && section.lessons?.map(lesson => (
            <button key={lesson.id}
              onClick={() => lesson.free && navigate(`/course/${course.id}/learn`)}
              disabled={!lesson.free}
              className={`w-full flex items-start gap-3 px-5 py-3 text-left border-t border-white/5 transition-colors
                ${lesson.free ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-default'}`}>
              <div className={`shrink-0 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center
                ${lesson.free ? 'border-primary' : 'border-gray-600'}`}>
                {lesson.free
                  ? <Play className="w-2 h-2 text-primary ml-0.5" />
                  : <Lock className="w-2 h-2 text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${lesson.free ? 'text-gray-200' : 'text-gray-500'}`}>
                  {lesson.title}
                  {lesson.free && (
                    <span className="ml-1.5 text-[9px] text-green-400 font-bold border border-green-400/30 px-1 py-0.5 rounded align-middle">Free</span>
                  )}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">{lesson.duration}</p>
              </div>
            </button>
          ))}
        </div>
      )) : (
        <div className="p-8 text-center text-gray-600 text-sm">No lessons added yet</div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>
      <Header />

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 mt-16 shrink-0"
           style={{ background: '#131720' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="hidden sm:block border-l border-white/10 pl-4">
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest">{categoryLabel}</p>
            <p className="text-white font-semibold text-sm leading-tight mt-0.5 max-w-[200px] truncate">{course.title}</p>
          </div>
        </div>
        <button onClick={() => navigate(`/course/${course.id}/learn`)}
          className="flex items-center gap-2 bg-primary text-white font-bold px-4 sm:px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
          <Play className="w-4 h-4 fill-white" />
          {currentUser ? 'Start Learning' : 'Preview Free'}
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT / MAIN */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">

          {/* Video — pure CSS aspect-ratio, works perfectly on mobile */}
          <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
            {course.previewVideo ? (
              <iframe
                src={getBunnyEmbedUrl(course.previewVideo, { autoplay: true, muted: true })}
                className="w-full h-full block border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="origin"
                allowFullScreen
                title={course.title}
              />
            ) : course.image ? (
              <div className="relative w-full h-full">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <button onClick={() => navigate(`/course/${course.id}/learn`)}
                    className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center border-none cursor-pointer hover:bg-primary transition-colors">
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                <button onClick={() => navigate(`/course/${course.id}/learn`)}
                  className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center border-none cursor-pointer">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </button>
              </div>
            )}
          </div>

          {/* Course info */}
          <div className="px-4 sm:px-6 py-5 border-b border-white/10">
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">{categoryLabel}</p>
            <h1 className="text-white font-extrabold text-lg sm:text-xl leading-tight mb-2">{course.title}</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{course.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-5">
              {course.rating && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{Number(course.rating).toFixed(1)}</span>
                </span>
              )}
              {course.duration_hours && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.duration_hours}h</span>}
              {course.students_count && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{course.students_count.toLocaleString()}</span>}
              {course.level && <span className="border border-white/20 px-2 py-0.5 rounded text-xs">{course.level}</span>}
              {totalLessons > 0 && <span className="text-gray-500 text-xs">{totalLessons} lessons · {freeLessons} free</span>}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {course.instructor_image
                  ? <img src={course.instructor_image} alt={course.instructor} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">{course.instructor?.[0] || 'N'}</div>
                }
                <div>
                  <p className="text-white font-semibold text-sm">{course.instructor || 'NourishMind Expert'}</p>
                  <p className="text-gray-500 text-xs">Instructor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-white">
                  {course.price ? `$${course.price}` : <span className="text-green-400">Free</span>}
                </span>
                <button onClick={() => navigate(`/course/${course.id}/learn`)}
                  className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm">
                  <Play className="w-4 h-4 fill-white" />
                  {currentUser ? 'Start Learning' : 'Preview Free'}
                </button>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="px-4 sm:px-6 py-5 border-b border-white/10">
            <h3 className="text-white font-bold mb-3">What you get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Expert-led video lessons','Certificate of completion','Lifetime access','Mobile & desktop access'].map(item => (
                <div key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          {course.tags?.length > 0 && (
            <div className="px-4 sm:px-6 py-4 flex flex-wrap gap-2 border-b border-white/10">
              {course.tags.map(t => (
                <span key={t} className="bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full">{t}</span>
              ))}
            </div>
          )}

          {/* Course Content — mobile accordion (visible on mobile, hidden on lg) */}
          {totalLessons > 0 && (
            <div className="lg:hidden border-b border-white/10">
              <button
                onClick={() => setShowCurriculum(p => !p)}
                className="w-full flex items-center justify-between px-4 py-4 text-left">
                <div>
                  <p className="text-white font-bold text-sm">Course Content</p>
                  <p className="text-gray-500 text-xs mt-0.5">{totalLessons} lessons · {freeLessons} free previews</p>
                </div>
                {showCurriculum
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {showCurriculum && <SectionList />}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR — desktop only */}
        <div className="w-80 shrink-0 border-l border-white/10 overflow-y-auto hidden lg:flex flex-col"
             style={{ background: '#131720' }}>
          <div className="px-5 py-4 border-b border-white/10 shrink-0">
            <p className="text-white font-bold text-sm">Course Content</p>
            <p className="text-gray-500 text-xs mt-0.5">{totalLessons} lessons · {freeLessons} free previews</p>
          </div>
          <SectionList />
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
