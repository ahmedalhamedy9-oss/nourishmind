import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardModal from '@/components/DashboardModal';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const NAV_LINKS = [
  { path: '/',        label: 'Home' },
  { path: '/courses', label: 'Courses' },
  { path: '/about',   label: 'About' },
  { path: '/pricing', label: 'Pricing' },
];

const Logo = () => (
  <Link to="/" className="flex items-center shrink-0">
    <img src="/logo.svg" alt="NourishMind" style={{ height: '40px', width: 'auto' }} />
  </Link>
);

const Avatar = ({ src, initials, size = 36 }) => (
  src ? (
    <img src={src} alt="avatar"
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover',
               border:'2px solid rgba(74,155,142,0.4)', display:'block', flexShrink:0 }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'rgba(74,155,142,0.15)',
                  border:'2px solid rgba(74,155,142,0.4)', display:'flex', alignItems:'center',
                  justifyContent:'center', color:'#5fbfb0', fontWeight:700,
                  fontSize:size*0.42, flexShrink:0 }}>
      {initials}
    </div>
  )
);

/* ── Floating WhatsApp Button ── */
export const FloatingWhatsApp = () => {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    // Listen to settings/contact in Firestore for whatsapp number
    const unsub = onSnapshot(doc(db, 'settings', 'contact'),
      snap => { if (snap.exists()) setPhone(snap.data().whatsapp || ''); },
      () => {}
    );
    return unsub;
  }, []);

  if (!phone) return null;

  const num = phone.replace(/[^0-9]/g, '');
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isMobile
    ? `https://wa.me/${num}`
    : `https://web.whatsapp.com/send?phone=${num}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      title="Chat with us on WhatsApp"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        width: 56, height: 56, borderRadius: '50%',
        background: '#25D366',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.45)',
        transition: 'transform .2s, box-shadow .2s',
        textDecoration: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(37,211,102,0.6)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(37,211,102,0.45)'; }}
    >
      {/* WhatsApp SVG icon */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
};

/* ── Header ── */
const Header = () => {
  const [scrolled,      setScrolled]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const { currentUser, userData, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
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
          backdropFilter:'blur(20px) saturate(180%)',
          WebkitBackdropFilter:'blur(20px) saturate(180%)',
          borderBottom:  scrolled ? '1px solid rgba(74,155,142,0.2)' : '1px solid rgba(74,155,142,0.08)',
          boxShadow:     scrolled ? '0 4px 32px rgba(0,0,0,0.3)' : 'none',
        }}>
        <div className="w-full px-4 sm:px-6 flex items-center gap-4">
          <Logo />

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

            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Wishlist */}
                <Link to="/certificates" title="My Certificates"
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{ color:'rgba(180,220,215,0.6)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8 }}
                  onMouseEnter={e => { e.currentTarget.style.color='#5fbfb0'; }}
                  onMouseLeave={e => { e.currentTarget.style.color='rgba(180,220,215,0.6)'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                  </svg>
                </Link>

                <button onClick={openDash} className="hidden md:block text-sm transition-colors"
                  style={{ color:'rgba(200,230,225,0.7)', background:'none', border:'none', cursor:'pointer' }}
                  onMouseEnter={e => e.target.style.color='#5fbfb0'}
                  onMouseLeave={e => e.target.style.color='rgba(200,230,225,0.7)'}
                >
                  My Courses
                </button>

                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    style={{ border:'1px solid rgba(74,155,142,0.4)', color:'#5fbfb0', background:'rgba(74,155,142,0.08)' }}>
                    <Shield size={12} /> Admin
                  </Link>
                )}

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
            {currentUser ? (
              <>
                <button onClick={openDash} className="text-sm py-2.5 px-4 rounded-xl text-center font-semibold"
                  style={{ border:'1px solid rgba(74,155,142,0.3)', color:'#5fbfb0', background:'rgba(74,155,142,0.07)', cursor:'pointer' }}>
                  My Dashboard
                </button>
                <Link to="/certificates" onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-center justify-center"
                  style={{ border:'1px solid rgba(74,155,142,0.3)', color:'#5fbfb0', background:'rgba(74,155,142,0.07)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                  </svg>
                  My Certificates
                </Link>
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

      {dashboardOpen && <DashboardModal onClose={closeDash} />}

      {/* Floating WhatsApp */}
      <FloatingWhatsApp />
    </>
  );
};

export default Header;

