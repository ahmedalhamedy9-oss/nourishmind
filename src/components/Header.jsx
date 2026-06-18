import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, Bell, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr } from '@/lib/translations';

const Logo = () => (
  <Link to="/" className="flex items-center shrink-0">
    <img src="/logo.svg" alt="NourishMind" style={{ height: '44px', width: 'auto' }} />
  </Link>
);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout, isAdmin } = useAuth();
  const { lang, isAr, toggle } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(10, 20, 18, 0.55)' : 'rgba(10, 20, 18, 0.25)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: scrolled ? '1px solid rgba(74, 155, 142, 0.15)' : '1px solid rgba(74, 155, 142, 0.08)',
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center gap-6">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {[
              { path: '/', label: tr('home', lang) },
              { path: '/courses', label: tr('courses', lang) },
              { path: '/about', label: tr('about', lang) },
              { path: '/pricing', label: tr('pricing', lang) },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className="relative transition-colors duration-200"
                style={{
                  color: isActive(path) ? '#5fbfb0' : 'rgba(200, 230, 225, 0.75)',
                  fontWeight: isActive(path) ? '600' : '400',
                }}
                onMouseEnter={e => { if (!isActive(path)) e.target.style.color = '#a8ddd7'; }}
                onMouseLeave={e => { if (!isActive(path)) e.target.style.color = 'rgba(200, 230, 225, 0.75)'; }}
              >
                {label}
                {isActive(path) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #4a9b8e, #5fbfb0)' }} />
                )}
              </Link>
            ))}
          </nav>

          <div className={`${isAr ? 'mr-auto' : 'ml-auto'} flex items-center gap-3`}>

            {/* Language toggle */}
            <button
              onClick={toggle}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                border: '1px solid rgba(74, 155, 142, 0.35)',
                color: '#5fbfb0',
                background: 'rgba(74, 155, 142, 0.08)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74, 155, 142, 0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74, 155, 142, 0.08)'; }}
            >
              {isAr ? 'EN' : 'عر'}
            </button>

            <button className="transition-colors" style={{ color: 'rgba(180,220,215,0.6)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#5fbfb0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(180,220,215,0.6)'}>
              <Search className="w-4.5 h-4.5" />
            </button>

            {currentUser && (
              <button className="transition-colors" style={{ color: 'rgba(180,220,215,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#5fbfb0'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(180,220,215,0.6)'}>
                <Bell className="w-4.5 h-4.5" />
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <Link to="/dashboard"
                  className="hidden md:block text-sm transition-colors"
                  style={{ color: 'rgba(200, 230, 225, 0.7)' }}
                  onMouseEnter={e => e.target.style.color = '#5fbfb0'}
                  onMouseLeave={e => e.target.style.color = 'rgba(200, 230, 225, 0.7)'}
                >
                  {tr('myCourses', lang)}
                </Link>
                {isAdmin && (
                  <Link to="/admin"
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      border: '1px solid rgba(74,155,142,0.4)',
                      color: '#5fbfb0',
                      background: 'rgba(74,155,142,0.08)',
                    }}
                  >
                    <Shield className="w-3 h-3" /> {tr('admin', lang)}
                  </Link>
                )}
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-sm transition-colors"
                  style={{ color: 'rgba(200,230,225,0.6)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#5fbfb0'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,230,225,0.6)'}
                >
                  {currentUser.displayName?.split(' ')[0] || 'Account'} ↗
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login"
                  className="text-sm transition-colors"
                  style={{ color: 'rgba(200,230,225,0.7)' }}
                  onMouseEnter={e => e.target.style.color = '#a8ddd7'}
                  onMouseLeave={e => e.target.style.color = 'rgba(200,230,225,0.7)'}
                >
                  {tr('signIn', lang)}
                </Link>
                <Link to="/signup"
                  className="text-sm font-semibold px-5 py-2 rounded-full transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #4a9b8e, #3d7a6e)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(74,155,142,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(74,155,142,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(74,155,142,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                >
                  {tr('startFree', lang)}
                </Link>
              </div>
            )}

            <button className="md:hidden" style={{ color: '#5fbfb0' }} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-16 left-0 right-0 z-40 p-4 flex flex-col gap-3"
          style={{
            background: 'rgba(8,18,16,0.92)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(74,155,142,0.15)',
          }}
        >
          {[
            { path: '/', label: tr('home', lang) },
            { path: '/courses', label: tr('courses', lang) },
            { path: '/about', label: tr('about', lang) },
            { path: '/pricing', label: tr('pricing', lang) },
          ].map(({ path, label }) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)}
              style={{ color: isActive(path) ? '#5fbfb0' : 'rgba(200,230,225,0.8)', fontWeight: isActive(path) ? '600' : '400' }}>
              {label}
            </Link>
          ))}
          {currentUser && <Link to="/my-courses" onClick={() => setMenuOpen(false)} style={{ color: 'rgba(200,230,225,0.8)' }}>{tr('myCourses', lang)}</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ color: '#5fbfb0', fontWeight: '700' }}>{tr('admin', lang)}</Link>}
          {!currentUser && <Link to="/login" onClick={() => setMenuOpen(false)} style={{ color: 'rgba(200,230,225,0.8)' }}>{tr('signIn', lang)}</Link>}
          {!currentUser && <Link to="/signup" onClick={() => setMenuOpen(false)} style={{ color: '#5fbfb0', fontWeight: '700' }}>{tr('startFree', lang)}</Link>}
          {currentUser && <button onClick={() => { logout(); setMenuOpen(false); }} style={{ color: '#ef4444', textAlign: 'left' }}>Logout</button>}
          <button onClick={toggle} style={{ color: '#5fbfb0', border: '1px solid rgba(74,155,142,0.3)', borderRadius: '8px', padding: '8px 12px', width: 'fit-content', background: 'rgba(74,155,142,0.08)' }}>
            {isAr ? '🌐 English' : '🌐 العربية'}
          </button>
        </div>
      )}
    </>
  );
};

export default Header;
