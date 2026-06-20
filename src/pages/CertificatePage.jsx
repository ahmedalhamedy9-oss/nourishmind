import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, ArrowLeft, Check, X } from 'lucide-react';
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/* ── Request Form Modal ── */
const RequestModal = ({ cert, onClose, onSubmit }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ name: currentUser?.displayName||'', phone:'', bestTime:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handle = async () => {
    if (!form.name.trim()||!form.phone.trim()) { alert('Please fill name and phone.'); return; }
    setSaving(true);
    try { await onSubmit({...form, certName:cert.alt, certUrl:cert.url}); onClose(); }
    catch(e) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#0d1a17', border:'1px solid rgba(74,155,142,0.25)', borderRadius:20, width:'100%', maxWidth:440, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>Request Certificate</p>
            <p style={{ color:'rgba(200,220,215,0.45)', fontSize:12, margin:'2px 0 0' }}>{cert.alt}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(200,220,215,0.6)' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Cert preview */}
        <div style={{ padding:'16px 20px 0' }}>
          <img src={cert.url} alt={cert.alt} style={{ width:'100%', borderRadius:10, objectFit:'cover', maxHeight:140, border:'1px solid rgba(255,255,255,0.08)' }} onError={e=>e.target.style.display='none'}/>
          {cert.price && (
            <div style={{ display:'flex', gap:20, marginTop:12, padding:'10px 14px', background:'rgba(74,155,142,0.07)', borderRadius:10, border:'1px solid rgba(74,155,142,0.15)' }}>
              <div>
                <p style={{ color:'rgba(200,220,215,0.45)', fontSize:10, margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Price</p>
                <p style={{ color:'#5fbfb0', fontWeight:700, fontSize:16, margin:0 }}>{cert.price}</p>
              </div>
              {cert.delivery && (
                <div>
                  <p style={{ color:'rgba(200,220,215,0.45)', fontSize:10, margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Delivery</p>
                  <p style={{ color:'#fff', fontWeight:600, fontSize:14, margin:0 }}>{cert.delivery}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Full Name *', key:'name', placeholder:'Your full name', type:'text' },
            { label:'Phone Number *', key:'phone', placeholder:'+201012345678', type:'tel' },
            { label:'Best Time to Contact', key:'bestTime', placeholder:'e.g. Weekdays after 6pm', type:'text' },
          ].map(({label,key,placeholder,type}) => (
            <div key={key}>
              <p style={{ color:'rgba(200,220,215,0.5)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 5px' }}>{label}</p>
              <input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,155,142,0.2)', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#fff', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#5fbfb0'}
                onBlur={e=>e.target.style.borderColor='rgba(74,155,142,0.2)'}
              />
            </div>
          ))}

          <button onClick={handle} disabled={saving}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px', borderRadius:12, background:'linear-gradient(135deg,#4a9b8e,#3d7a6e)', border:'none', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', marginTop:4, opacity:saving?0.6:1 }}>
            <Check size={16}/> {saving?'Sending…':'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const CertificatePage = () => {
  const { currentUser } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [userProgress,   setUserProgress]   = useState({});
  const [certificates,   setCertificates]   = useState([]);
  const [certsLoading,   setCertsLoading]   = useState(true);
  const [selectedCert,   setSelectedCert]   = useState(null);
  const [submitted,      setSubmitted]      = useState(false);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    getDoc(doc(db,'users',currentUser.uid))
      .then(snap => { if(snap.exists()) setUserProgress(snap.data().progress||{}); })
      .catch(()=>{});
  }, [currentUser]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db,'certificates'),
      snap => { setCertificates(snap.docs.map(d=>({id:d.id,...d.data()}))); setCertsLoading(false); },
      ()=>{ setCertsLoading(false); }
    );
    return unsub;
  }, []);

  const completedCourses = courses.filter(c => userProgress[c.id] === 100);

  const submitRequest = async (data) => {
    await addDoc(collection(db,'certificate_requests'), {
      ...data,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-12 pt-28 pb-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4"/> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-primary"/>
          <h1 className="text-3xl font-extrabold text-white">Certificates</h1>
        </div>
        <p className="text-gray-400 mb-10">Choose a certificate to request — we'll contact you to complete the process.</p>

        {/* Success toast */}
        {submitted && (
          <div style={{ position:'fixed', bottom:90, right:24, zIndex:300, background:'#22c55e', color:'#fff', padding:'12px 20px', borderRadius:12, fontWeight:600, fontSize:13, boxShadow:'0 4px 20px rgba(34,197,94,0.4)', display:'flex', alignItems:'center', gap:8 }}>
            <Check size={16}/> Request sent! We'll contact you soon.
          </div>
        )}

        {/* ── Completed courses section ── */}
        {completedCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-white mb-2">Completed Courses</h2>
            <p className="text-gray-500 text-sm mb-5">You've completed these courses — you're eligible for certification.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {completedCourses.map(course => (
                <div key={course.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                  {course.image
                    ? <img src={course.image} alt={course.title} style={{width:64,height:44,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                    : <div style={{width:64,height:44,borderRadius:8,background:'rgba(74,155,142,0.1)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Award size={20} color="rgba(74,155,142,0.4)"/></div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{course.title}</p>
                    <p className="text-primary text-xs mt-0.5">{course.instructor||'NourishMind'}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full shrink-0">
                    <Check size={10}/> 100%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Accredited Certificates ── */}
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Accredited Certificates</h2>
          <p className="text-gray-500 text-sm mb-6">Select a certificate to request — fill in your details and we'll get in touch.</p>

          {certsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3].map(i => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="w-full aspect-video bg-white/5" />
                  <div className="p-4">
                    <div className="h-4 bg-white/5 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-4"/>
              <p className="text-gray-400 text-lg font-semibold mb-2">No certificates available yet</p>
              <p className="text-gray-600 text-sm">The admin will add certificates soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {certificates.map(cert => (
                <div key={cert.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all cursor-pointer group"
                  onClick={() => setSelectedCert(cert)}>
                  <div className="relative">
                    <img src={cert.url} alt={cert.alt} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <span className="text-white text-sm font-bold bg-primary/80 px-4 py-2 rounded-full">Request This Certificate</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold text-sm mb-1">{cert.alt||'Certificate'}</h3>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {cert.price && <span className="text-primary font-bold text-sm">{cert.price}</span>}
                      {cert.delivery && <span className="text-gray-500 text-xs">Delivery: {cert.delivery}</span>}
                    </div>
                    {cert.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{cert.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer/>

      {selectedCert && (
        <RequestModal
          cert={selectedCert}
          onClose={() => setSelectedCert(null)}
          onSubmit={submitRequest}
        />
      )}
    </div>
  );
};

export default CertificatePage;

