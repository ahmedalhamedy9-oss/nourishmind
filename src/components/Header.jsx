import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, Bell, Shield, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardModal from '@/components/DashboardModal';
import { useCourses } from '@/hooks/useCourses';

const NAV_LINKS = [
  { path: '/',         label: 'Home' },
  { path: '/courses',  label: 'Courses' },
  { path: '/about',    label: 'About' },
  { path: '/pricing',  label: 'Pricing' },
];

const Logo = () => (
  <Link to="/" className="flex items-center shrink-0">
    <img src="/logo.svg" alt="NourishMind" style={{ height: '40px', width: 'auto' }} />
  </Link>
);

const Avatar = ({ src, initials, size = 36 }) => (
  src ? (
    <img src={src} alt="avatar"
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(74,155,142,0.4)', display:'block', flexShrink:0 }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'rgba(74,155,142,0.15)', border:'2px solid rgba(74,155,142,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#5fbfb0', fontWeight:700, fontSize:size*0.42, flexShrink:0 }}>
      {initials}
    </div>
  )
);

/* ── Global Search Overlay ── */
const SearchOverlay = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const { courses } = useCourses();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = query.trim().length < 2 ? [] :
    courses.filter(c =>
      c.title?.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase()) ||
      c.category?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80 }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:600, margin:'0 16px' }}>
        {/* Search input */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <Search size={18} style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'rgba(200,220,215,0.5)', pointerEvents:'none' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search courses…"
            style={{
              width:'100%', background:'#0d1a17', border:'1px solid rgba(74,155,142,0.4)',
              borderRadius:14, padding:'14px 16px 14px 48px', fontSize:16, color:'#fff',
              outline:'none', boxSizing:'border-box',
            }}
          />
          <button onClick={onClose}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(200,220,215,0.5)', cursor:'pointer', fontSize:12 }}>
            ESC
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ background:'#0d1a17', border:'1px solid rgba(74,155,142,0.2)', borderRadius:14, overflow:'hidden' }}>
            {results.map((course, i) => (
              <button key={course.id}
                onClick={() => { navigate(`/course/${course.id}`); onClose(); }}
                style={{
                  display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 16px',
                  background:'transparent', border:'none', borderTop: i>0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  cursor:'pointer', textAlign:'left', transition:'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(74,155,142,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                {course.image
                  ? <img src={course.image} alt="" style={{ width:44, height:30, borderRadius:6, objectFit:'cover', flexShrink:0 }} />
                  : <div style={{ width:44, height:30, borderRadius:6, background:'rgba(74,155,142,0.1)', flexShrink:0 }} />
                }
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{course.title}</p>
                  <p style={{ color:'rgba(200,220,215,0.45)', fontSize:11, margin:'2px 0 0' }}>{course.category} · {course.price ? `$${course.price}` : 'Free'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && results.length === 0 && (
          <div style={{ background:'#0d1a17', border:'1px solid rgba(74,155,142,0.2)', borderRadius:14, padding:'20px 16px', textAlign:'center', color:'rgba(200,220,215,0.4)', fontSize:13 }}>
            No courses found for "{query}"
          </div>
        )}
        {query.trim().length < 2 && (
          <div style={{ textAlign:'center', color:'rgba(200,220,215,0.3)', fontSize:12, marginTop:8 }}>
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Header ── */
const Header = () => {
  const [scrolled,      setScrolled]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const { currentUser, userData, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive  = (path) => location.pathname === path;
  const closeMenu = () => setMenuOpen(false);
  const openDash  = () => { setDashboardOpen(true); setMenuOpen(false); };
  const closeDash = () => setDashboardOpen(false);

  const displayAvatar = userData?.avatar || currentUser?.photoURL;
  const displayName   = userData?.name   || currentUser?.displayName;
  const initials      = (displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-500"
        style={{
          background:    scrolled ? 'rgba(10,20,18,0.75)' : 'rgba(10,20,18,0.35)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom:  scrolled ? '1px solid rgba(74,155,142,0.2)' : '1px solid rgba(74,155,142,0.08)',
          boxShadow:     scrolled ? '0 4px 32px rgba(0,0,0,0.3)' : 'none',
        }}>
        <div className="w-full px-4 sm:px-6 flex items-center gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-4">
            {NAV_LINKS.map(({ path, label }) => (
              <Link key={path} to={path} className="relative transition-colors duration-200"
                style={{ color:isActive(path)?'#5fbfb0':'rgba(200,230,225,0.75)', fontWeight:isActive(path)?600:400 }}>
                {label}
                {isActive(path) && <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ background:'linear-gradient(90deg,#4a9b8e,#5fbfb0)' }} />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 transition-colors"
              style={{ color:'rgba(180,220,215,0.6)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}
              onMouseEnter={e => e.currentTarget.style.color='#5fbfb0'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(180,220,215,0.6)'}
            >
              <Search size={15} />
              <span className="hidden sm:inline">Search</span>
              <span className="hidden md:inline text-[10px] opacity-50 ml-1">⌘K</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Wishlist link */}
                <Link to="/courses?wishlist=1" title="My Wishlist"
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                  style={{ color:'rgba(180,220,215,0.6)', background:'rgba(255,255,255,0.04)', border:'none' }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(180,220,215,0.6)'}
                >
                  <Heart size={16} />
                </Link>

                {/* My Courses */}
                <button onClick={openDash} className="hidden md:block text-sm transition-colors"
                  style={{ color:'rgba(200,230,225,0.7)', background:'none', border:'none', cursor:'pointer' }}
                  onMouseEnter={e => e.target.style.color='#5fbfb0'}
                  onMouseLeave={e => e.target.style.color='rgba(200,230,225,0.7)'}
                >
                  My Courses
                </button>

                {/* Admin badge */}
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    style={{ border:'1px solid rgba(74,155,142,0.4)', color:'#5fbfb0', background:'rgba(74,155,142,0.08)' }}>
                    <Shield size={12} /> Admin
                  </Link>
                )}

                {/* Avatar */}
                <button onClick={openDash} className="flex items-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  <Avatar src={displayAvatar} initials={initials} size={36} />
                  <span className="hidden sm:block text-sm font-medium" style={{ color:'rgba(200,230,225,0.85)' }}>
                    {displayName?.split(' ')[0] || 'Account'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block text-sm transition-colors"
                  style={{ color:'rgba(200,230,225,0.7)' }}
                  onMouseEnter={e => e.target.style.color='#a8ddd7'}
                  onMouseLeave={e => e.target.style.color='rgba(200,230,225,0.7)'}
                >Sign In</Link>
                <Link to="/signup" className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all"
                  style={{ background:'linear-gradient(135deg,#4a9b8e,#3d7a6e)', color:'#fff', boxShadow:'0 0 20px rgba(74,155,142,0.3)' }}>
                  Start Free
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
              style={{ color:'#5fbfb0', background:menuOpen?'rgba(74,155,142,0.12)':'transparent', border:'none', cursor:'pointer' }}
              onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 flex flex-col"
          style={{ background:'rgba(8,18,16,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(74,155,142,0.15)' }}>
          {currentUser && (
            <button onClick={openDash} className="flex items-center gap-3 px-4 py-4 border-b w-full text-left"
              style={{ borderColor:'rgba(74,155,142,0.15)', background:'none', cursor:'pointer' }}>
              <Avatar src={displayAvatar} initials={initials} size={40} />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{displayName||'My Account'}</p>
                <p className="text-xs truncate" style={{ color:'rgba(200,230,225,0.45)' }}>{currentUser.email}</p>
              </div>
              <span className="ml-auto text-xs" style={{ color:'#5fbfb0' }}>View →</span>
            </button>
          )}
          <div className="flex flex-col px-4 pt-3 pb-2 gap-0.5">
            {NAV_LINKS.map(({ path, label }) => (
              <Link key={path} to={path} onClick={closeMenu}
                className="py-3 px-2 text-sm font-medium border-b border-white/5 transition-colors"
                style={{ color:isActive(path)?'#5fbfb0':'rgba(200,230,225,0.8)' }}>
                {label}
              </Link>
            ))}
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            <button onClick={() => { setSearchOpen(true); closeMenu(); }}
              className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-xl"
              style={{ border:'1px solid rgba(255,255,255,0.1)', color:'rgba(200,230,225,0.8)', background:'none', cursor:'pointer' }}>
              <Search size={15} /> Search Courses
            </button>
            {currentUser ? (
              <>
                <button onClick={openDash} className="text-sm py-2.5 px-4 rounded-xl text-center font-semibold"
                  style={{ border:'1px solid rgba(74,155,142,0.3)', color:'#5fbfb0', background:'rgba(74,155,142,0.07)', cursor:'pointer' }}>
                  My Dashboard
                </button>
                {isAdmin && (
                  <Link to="/admin" onClick={closeMenu} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-center justify-center"
                    style={{ border:'1px solid rgba(74,155,142,0.4)', color:'#5fbfb0', background:'rgba(74,155,142,0.08)' }}>
                    <Shield size={14} /> Admin Panel
                  </Link>
                )}
                <button onClick={() => { logout(); navigate('/'); closeMenu(); }}
                  className="text-sm py-2.5 px-4 rounded-xl text-center"
                  style={{ color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.05)', cursor:'pointer' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="text-sm py-2.5 px-4 rounded-xl text-center"
                  style={{ color:'rgba(200,230,225,0.8)', border:'1px solid rgba(255,255,255,0.1)' }}>Sign In</Link>
                <Link to="/signup" onClick={closeMenu} className="text-sm font-bold py-2.5 px-4 rounded-xl text-center"
                  style={{ background:'linear-gradient(135deg,#4a9b8e,#3d7a6e)', color:'#fff' }}>Start Free</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      {dashboardOpen && <DashboardModal onClose={closeDash} />}

      {/* Global Search Overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
};

export default Header;
