import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Play, Star, Clock, Heart } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCourses } from '@/hooks/useCourses';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';

const CoursesPage = () => {
  const { courses, loading } = useCourses();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'all');
  const [search, setSearch] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [wishlistBusy, setWishlistBusy] = useState({});
  const navigate = useNavigate();

  // Load user wishlist
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => { if (snap.exists()) setWishlist(snap.data().wishlist || []); })
      .catch(() => {});
  }, [currentUser]);

  const toggleWishlist = async (e, courseId) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    if (wishlistBusy[courseId]) return;
    setWishlistBusy(b => ({ ...b, [courseId]: true }));
    try {
      const isIn = wishlist.includes(courseId);
      const updated = isIn ? wishlist.filter(x => x !== courseId) : [...wishlist, courseId];
      await updateDoc(doc(db, 'users', currentUser.uid), { wishlist: updated });
      setWishlist(updated);
    } catch (_) {}
    finally { setWishlistBusy(b => ({ ...b, [courseId]: false })); }
  };

  const filtered = courses.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 px-4 sm:px-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-2">All Courses</h1>
        <p className="text-gray-400 mb-8">Explore our full library of evidence-based courses</p>

        <input type="text" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-card border border-border text-white rounded-lg px-4 py-2.5 mb-6 focus:outline-none focus:border-primary placeholder-gray-500" />

        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory==='all'?'bg-primary text-white':'bg-card border border-border text-gray-300 hover:border-primary'}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory===cat.id?'bg-primary text-white':'bg-card border border-border text-gray-300 hover:border-primary'}`}>
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-20">No courses found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(course => {
              const inWishlist = wishlist.includes(course.id);
              return (
                <div key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                  className="group bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-all relative">

                  {/* Wishlist button */}
                  <button
                    onClick={e => toggleWishlist(e, course.id)}
                    title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: inWishlist ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(4px)',
                      border: 'none',
                    }}>
                    <Heart size={13} color="#fff" fill={inWishlist ? '#fff' : 'none'} />
                  </button>

                  <div className="relative aspect-video overflow-hidden">
                    {course.image
                      ? <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Play className="w-8 h-8 text-primary/40" /></div>
                    }
                    {course.new && <span className="absolute top-2 left-2 bg-green-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase">New</span>}
                    {course.level && <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-sm">{course.level}</span>}
                  </div>

                  <div className="p-3">
                    <p className="text-primary text-[10px] font-bold uppercase tracking-wide mb-1">{categories.find(c=>c.id===course.category)?.label||course.category}</p>
                    <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-2">{course.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />{course.rating?.toFixed(1)}</span>
                      <span className="text-primary font-bold">{course.price ? `$${course.price}` : 'Free'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CoursesPage;
