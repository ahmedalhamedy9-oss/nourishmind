import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, Users, Globe, Star } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseRow from '@/components/CourseRow';
import CertificatesCarousel from '@/components/CertificatesMarquee';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr } from '@/lib/translations';
import ReviewsSection from '@/components/ReviewsSection';
import { ROWS } from '@/lib/data';

const HERO_BG = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80';

const HomePage = () => {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { lang, isAr } = useLanguage();
  const { currentUser } = useAuth();
  const [userProgress, setUserProgress] = useState({});
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'certificates'),
      snap => setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserProgress(d.progress || {});
        setEnrolledIds(d.enrolledCourses || []);
      }
    };
    load();
  }, [currentUser]);

  const getRow = (row) => courses.filter(row.filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── HERO ── */}
      <section className="relative min-h-screen overflow-hidden flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Hero" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-6 sm:px-16 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`max-w-3xl ${isAr ? 'mr-0 ml-auto text-right' : 'max-w-2xl'}`}
          >
            {/* Subtitle tag — hide in Arabic */}
            {!isAr && (
              <p className="text-primary font-bold text-sm uppercase tracking-widest mb-4">
                NOURISHMIND · Wellness Learning Platform
              </p>
            )}

            {/* Main title */}
            <h1 className={`font-extrabold text-white leading-[1.15] mb-6 ${isAr ? 'text-5xl sm:text-6xl' : 'text-5xl sm:text-7xl'}`}>
              {isAr ? (
                <>استثمر في مستقبلك،{' '}<span className="text-primary">تعلم في أي وقت</span></>
              ) : (
                <>Nourish Your Mind,{' '}<span className="text-primary">Elevate Your Life</span></>
              )}
            </h1>

            {/* Description */}
            <p className="text-gray-300 text-lg mb-10 max-w-xl leading-relaxed">
              {tr('heroDesc', lang)}
            </p>

            {/* CTA Buttons */}
            <div className={`flex items-center gap-4 mb-12 flex-wrap ${isAr ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
              <button
                onClick={() => navigate('/courses')}
                className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all text-base shadow-lg"
              >
                <Play className="w-5 h-5 fill-black" /> {tr('startLearning', lang)}
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all text-base"
              >
                <Info className="w-5 h-5" /> {tr('browseCourses', lang)}
              </button>
            </div>

            {/* Stats row */}
            <div className={`flex items-center gap-8 text-sm text-gray-300 flex-wrap ${isAr ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {tr('students', lang)}
              </span>
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                AR / EN
              </span>
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {tr('rating', lang)}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CERTIFICATES 3D CAROUSEL ── */}
      <CertificatesCarousel certificates={certificates} />

      {/* ── COURSE ROWS ── */}
      <section className="relative z-10 pb-8">
        {/* Top 10 row */}
        <CourseRow
          title="🏆 Top 10 Courses Today"
          courses={[...courses.filter(c => c.top10)].sort((a,b) => (a.top10_rank||99) - (b.top10_rank||99)).slice(0,10).concat(courses.filter(c=>!c.top10)).slice(0,10)}
          variant="top10"
          seeAllPath="/courses"
        />

        {/* Continue Learning - only for logged in users */}
        {currentUser && enrolledIds.length > 0 && (
          <CourseRow
            title="▶ Continue Learning"
            courses={courses.filter(c => enrolledIds.includes(c.id))}
            variant="continue"
            userProgress={userProgress}
          />
        )}

        {/* Other rows */}
        {ROWS.filter(r => r.id !== 'featured').map(row => (
          <CourseRow key={row.id} title={row.title} courses={getRow(row)} />
        ))}
      </section>

      <ReviewsSection />

      <Footer />
    </div>
  );
};

export default HomePage;
