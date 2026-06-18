import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Award, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';

const MyCoursesPage = () => {
  const { currentUser } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">Sign in to see your courses</p>
          <button onClick={() => navigate('/login')} className="text-primary hover:underline mt-2">Sign In</button>
        </div>
      </div>
    );
  }

  // For now show featured courses as "enrolled" — will be replaced with real enrollment
  const enrolled = courses.filter(c => c.featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-12 pt-28 pb-16">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-white">
            Welcome back, {currentUser.displayName?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-gray-400 mt-1">Continue where you left off.</p>
        </div>

        {enrolled.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-20 text-center">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-2">No courses yet</p>
            <p className="text-gray-400 mb-6">Browse our catalog and start learning today.</p>
            <button onClick={() => navigate('/courses')} className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
              Browse Courses
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-white font-bold text-lg mb-5">Continue Learning</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {enrolled.map(course => (
                <div key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                  className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all group">
                  <div className="relative aspect-video overflow-hidden">
                    {course.image
                      ? <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Play className="w-8 h-8 text-primary/30" /></div>
                    }
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-primary" style={{ width: `${Math.floor(Math.random() * 80 + 10)}%` }} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold text-sm line-clamp-2 mb-2">{course.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration_hours}h</span>
                      <button className="flex items-center gap-1 bg-primary/15 text-primary px-3 py-1 rounded-full font-semibold hover:bg-primary/25 transition-colors">
                        <Play className="w-3 h-3 fill-primary" /> Continue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Certificates section */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Award className="w-6 h-6 text-primary" />
                <h2 className="text-white font-bold text-lg">Your Certificates</h2>
              </div>
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
                <Award className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Complete a course to earn your first certificate</p>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyCoursesPage;
