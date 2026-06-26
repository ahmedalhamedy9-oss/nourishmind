import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';

const ToolsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default tools (fallback if Firestore empty)
  const DEFAULT_TOOLS = [
    {
      id: 'clinical',
      name: 'PsychDecide',
      subtitle: 'Clinical Decision Support · Nutritional Psychiatry',
      description: 'أداة دعم القرار السريري المتكاملة للأطباء وأخصائيي الصحة النفسية وأخصائيي التغذية',
      icon: '🧠',
      image: '',
      path: '/tools/clinical',
      badge: 'Physician',
      badgeColor: '#4a9b8e',
      available: true,
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'tools'));
        if (!snap.empty) {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTools(data);
        } else {
          setTools(DEFAULT_TOOLS);
        }
      } catch {
        setTools(DEFAULT_TOOLS);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }}>
      <Header />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">

        {/* Page title */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9b8e" strokeWidth="2.5">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4a9b8e' }}>Clinical Tools</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PsychDecide Tools</h1>
          <p className="text-sm" style={{ color: 'rgba(200,230,225,0.55)' }}>أدوات سريرية متخصصة للأطباء وأخصائيي الصحة النفسية والتغذية</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map(tool => (
              <div key={tool.id}
                onClick={() => tool.available && navigate(tool.path)}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  background: 'rgba(13,26,23,0.8)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: tool.available ? 1 : 0.5,
                  cursor: tool.available ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={e => { if (tool.available) { e.currentTarget.style.border = '1px solid rgba(74,155,142,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(74,155,142,0.12)'; }}}
                onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Image or icon */}
                <div className="relative h-44 flex items-center justify-center overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,rgba(74,155,142,0.08),rgba(91,184,196,0.05))' }}>
                  {tool.image ? (
                    <img src={tool.image} alt={tool.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl opacity-60">{tool.icon || '🔧'}</span>
                  )}
                  {/* Badge */}
                  {tool.badge && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{ background: 'rgba(13,26,23,0.85)', border: `1px solid ${tool.badgeColor || '#4a9b8e'}44`, color: tool.badgeColor || '#4a9b8e' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                      </svg>
                      {tool.badge}
                    </div>
                  )}
                  {!tool.available && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(7,15,13,0.6)' }}>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(200,230,225,0.5)' }}>Coming Soon</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-white text-base mb-1">{tool.name}</h3>
                  {tool.subtitle && <p className="text-xs mb-2" style={{ color: '#4a9b8e' }}>{tool.subtitle}</p>}
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(200,230,225,0.5)' }}>{tool.description}</p>

                  {tool.available && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#5fbfb0' }}>
                      <span>فتح الأداة</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
