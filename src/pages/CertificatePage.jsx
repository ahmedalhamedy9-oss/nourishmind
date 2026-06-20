import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, ArrowLeft } from 'lucide-react';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CertificatePage = () => {
  const { currentUser } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [userProgress, setUserProgress] = useState({});
  const [certificates, setCertificates] = useState([]);

  // Load user progress
  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    getDoc(doc(db, 'users', currentUser.uid))
      .then(snap => { if (snap.exists()) setUserProgress(snap.data().progress || {}); })
      .catch(() => {});
  }, [currentUser]);

  // Load certificate images from Firestore (admin-uploaded)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'certificates'),
      snap => setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  // Completed courses = progress === 100
  const completedCourses = courses.filter(c => userProgress[c.id] === 100);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-12 pt-28 pb-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold text-white">My Certificates</h1>
        </div>
        <p className="text-gray-400 mb-10">Certificates are issued after completing 100% of a course.</p>

        {completedCourses.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-semibold mb-2">No certificates yet</p>
            <p className="text-gray-600 text-sm mb-6">Complete a course to earn your certificate.</p>
            <button onClick={() => navigate('/courses')}
              className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm">
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {completedCourses.map(course => {
              // Try to match a certificate image uploaded by admin (by name match)
              const certImg = certificates.find(c =>
                c.alt?.toLowerCase().includes(course.title?.toLowerCase().split(' ')[0])
              ) || certificates[0];

              return (
                <div key={course.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all">

                  {/* Certificate image or default */}
                  {certImg ? (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <img src={certImg.url} alt={certImg.alt}
                        className="absolute inset-0 w-full h-full object-cover" />
                      {/* Overlay with student name */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-white font-bold text-lg drop-shadow">{currentUser?.displayName || 'Student'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <div className="text-center">
                        <Award className="w-16 h-16 text-primary/50 mx-auto mb-2" />
                        <p className="text-white font-bold">{currentUser?.displayName || 'Student'}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Certificate of Completion</p>
                    <h3 className="text-white font-bold text-lg mb-1">{course.title}</h3>
                    <p className="text-gray-400 text-sm">{course.instructor || 'NourishMind'}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                        ✓ 100% Complete
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="text-xs text-gray-400 hover:text-white border border-border hover:border-white/30 px-3 py-1 rounded-full transition-colors">
                        Print / Save PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show all uploaded certificates from admin */}
        {certificates.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-white mb-6">Accredited Certificates</h2>
            <p className="text-gray-500 text-sm mb-6">Official certificates accepted by professional bodies.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {certificates.map(cert => (
                <div key={cert.id} className="rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-all">
                  <img src={cert.url} alt={cert.alt} className="w-full aspect-video object-cover" />
                  {cert.alt && <p className="text-white text-sm font-semibold px-4 py-3 bg-card">{cert.alt}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CertificatePage;
