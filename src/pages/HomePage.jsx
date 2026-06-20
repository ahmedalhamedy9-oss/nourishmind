import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, Users, Globe, Star } from 'lucide-react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseRow from '@/components/CourseRow';
import CertificatesCarousel from '@/components/CertificatesMarquee';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import ReviewsSection from '@/components/ReviewsSection';
import { ROWS } from '@/lib/data';

const DEFAULT_HERO = {
  backgroundImage: 'https://res.cloudinary.com/de7haar7x/image/upload/f_auto,q_auto,w_1200/v1781974738/nourishmind/hero/ngcw5kiof2en8vgoiqim.jpg',
  tagline: 'NOURISHMIND · Wellness Learning Platform',
  title1: 'Nourish Your Mind,',
  title2: 'Elevate Your Life',
  subtitle: 'Expert-led courses in mental health, psychology & nutrition.',
  stat1_value: '50,000+', stat1_label: 'Students',
  stat2_value: 'AR / EN', stat2_label: 'Languages',
  stat3_value: '4.8',     stat3_label: 'Rating',
  cta1: 'Start Learning', cta2: 'Browse Courses',
};

const HERO_CACHE_KEY = 'nm_hero_cache';

const readHeroCache = () => {
  try {
    const raw = sessionStorage.getItem(HERO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeHeroCache = (data) => {
  try { sessionStorage.setItem(HERO_CACHE_KEY, JSON.stringify(data)); } catch {}
};

const HomePage = () => {
  const navigate = useNavigate();
  const { courses, loading: coursesLoading } = useCourses();
  const { currentUser } = useAuth();
  const [userProgress, setUserProgress] = useState({});
  const [enrolledIds,  setEnrolledIds]  = useState([]);
  const [wishlistIds,  setWishlistIds]  = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [hero, setHero] = useState(() => readHeroCache() || DEFAULT_HERO);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'hero'))
      .then(snap => {
        if (snap.exists()) {
          const data = { ...DEFAULT_HERO, ...snap.data() };
          setHero(data);
          writeHeroCache(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'certificates'),
      snap => setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  // Load user data ONCE — wishlist + progress + enrolled
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProgress(d.progress || {});
        setEnrolledIds(d.enrolledCourses || []);
        setWishlistIds(d.wishlist || []);
      }
    });
  }, [currentUser]);

  const getRow = (row) => courses.filter(row.filter);

  const stats = [
    { icon: Users, value: hero.stat1_value, label: hero.stat1_label },
    { icon: Globe, value: hero.stat2_value, label: hero.stat2_label },
    { icon: Star,  value: hero.stat3_value, label: hero.stat3_label },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content">
        {/* HERO */}
        <section
          aria-label="Welcome to NourishMind"
          className="relative min-h-screen flex items-center"
          style={{ overflow: 'hidden' }}>
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src={hero.backgroundImage}
              alt=""
              role="presentation"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative z-10 w-full px-6 sm:px-16 pt-20 pb-16">
            <motion.div
              initial={{ opacity:0, y:30 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.6 }}
              className="max-w-2xl w-full">
              <p className="text-primary font-bold text-xs sm:text-sm uppercase tracking-widest mb-4">
                {hero.tagline}
              </p>
              <h1 className="font-extrabold text-white leading-[1.15] mb-6 text-4xl sm:text-6xl lg:text-7xl">
                {hero.title1}{' '}<span className="text-primary">{hero.title2}</span>
              </h1>
              <p className="text-gray-300 text-lg mb-10 max-w-xl leading-relaxed">{hero.subtitle}</p>
              <div className="flex items-center gap-4 mb-12 flex-wrap justify-start">
                <button
                  onClick={() => navigate('/courses')}
                  className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all text-base shadow-lg">
                  <Play className="w-5 h-5 fill-black" /> {hero.cta1}
                </button>
                <button
                  onClick={() => navigate('/courses')}
                  className="flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all text-base">
                  <Info className="w-5 h-5" /> {hero.cta2}
                </button>
              </div>
              <ul className="flex items-center gap-6 text-sm text-gray-300 flex-wrap justify-start list-none p-0 m-0">
                {stats.map(({ icon: Icon, value, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span><strong>{value}</strong> {label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <CertificatesCarousel certificates={certificates} />

        <section aria-label="Course library" className="relative z-10 pb-8">
          {coursesLoading ? (
            <div className="px-4 sm:px-12 py-8">
              <div className="h-6 w-48 bg-white/5 rounded-lg mb-6 animate-pulse" />
              <div className="flex gap-4 overflow-hidden">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-shrink-0 w-[280px] animate-pulse">
                    <div className="aspect-video rounded-xl bg-white/5 mb-3" />
                    <div className="h-4 bg-white/5 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <CourseRow
                title="🏆 Top 10 Courses Today"
                courses={[...courses.filter(c=>c.top10)].sort((a,b)=>(a.top10_rank||99)-(b.top10_rank||99)).slice(0,10).concat(courses.filter(c=>!c.top10)).slice(0,10)}
                variant="top10"
                seeAllPath="/courses"
                wishlistIds={wishlistIds}
              />
              {currentUser && enrolledIds.length > 0 && (
                <CourseRow
                  title="▶ Continue Learning"
                  courses={courses.filter(c => enrolledIds.includes(c.id))}
                  variant="continue"
                  userProgress={userProgress}
                  wishlistIds={wishlistIds}
                />
              )}
              {ROWS.filter(r => r.id !== 'featured').map(row => (
                <CourseRow key={row.id} title={row.title} courses={getRow(row)} wishlistIds={wishlistIds} />
              ))}
            </>
          )}
        </section>

        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
