import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import CourseRow from '@/components/CourseRow';
import CertificatesCarousel from '@/components/CertificatesCarousel';
import ReviewsSection from '@/components/ReviewsSection';
import RevealSection from '@/components/RevealSection';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { ROWS } from '@/lib/data';

const HomePage = () => {
  const { courses, loading: coursesLoading } = useCourses();
  const { currentUser } = useAuth();
  const [userProgress, setUserProgress] = useState({});
  const [enrolledIds,  setEnrolledIds]  = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProgress(d.progress || {});
        setEnrolledIds(d.enrolledCourses || []);
      }
    });
  }, [currentUser]);

  const getRow = (row) => courses.filter(row.filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── HERO CAROUSEL ── */}
      <HeroCarousel />

      {/* ── COURSE ROWS ── */}
      <section className="relative z-10 pb-8">
        {coursesLoading ? (
          <div className="px-4 sm:px-12 py-8">
            <div className="h-6 w-48 rounded-lg mb-6 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="flex gap-4 overflow-hidden">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-shrink-0 animate-pulse" style={{ width:'190px' }}>
                  <div className="rounded-xl mb-3"
                    style={{ aspectRatio:'2/3', background:'rgba(255,255,255,0.05)' }} />
                  <div className="h-4 rounded mb-2 w-3/4"
                    style={{ background:'rgba(255,255,255,0.05)' }} />
                  <div className="h-3 rounded w-1/2"
                    style={{ background:'rgba(255,255,255,0.05)' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Top 10 */}
            <CourseRow
              title="🏆 Top 10 Courses Today"
              courses={[...courses.filter(c => c.top10)]
                .sort((a,b) => (a.top10_rank||99)-(b.top10_rank||99))
                .slice(0,10)
                .concat(courses.filter(c => !c.top10))
                .slice(0,10)}
              variant="top10"
              seeAllPath="/courses"
            />

            {/* Continue Learning */}
            {currentUser && enrolledIds.length > 0 && (
              <CourseRow
                title="▶ Continue Learning"
                courses={courses.filter(c => enrolledIds.includes(c.id))}
                variant="continue"
                userProgress={userProgress}
              />
            )}

            {/* Dynamic rows */}
            {ROWS.filter(r => r.id !== 'featured').map(row => (
              <CourseRow key={row.id} title={row.title} courses={getRow(row)} />
            ))}
          </>
        )}
      </section>

      {/* ── CERTIFICATES CAROUSEL ── */}
      <RevealSection delay={0}>
        <CertificatesCarousel />
      </RevealSection>

      {/* ── REVIEWS ── */}
      <RevealSection delay={100}>
        <ReviewsSection />
      </RevealSection>

      <Footer />
    </div>
  );
};

export default HomePage;
