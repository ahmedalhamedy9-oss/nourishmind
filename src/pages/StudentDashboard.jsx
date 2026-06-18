import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Camera, BookOpen, Award, Settings, LogOut, Check, Upload } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import Header from '@/components/Header';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
];

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [userData, setUserData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Profile form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    const load = async () => {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setName(d.name || '');
        setUsername(d.username || '');
        setPhone(d.phone || '');
        setAvatar(d.avatar || '');
      }
    };
    load();
  }, [currentUser]);

  const saveProfile = async () => {
    setSaving(true); setMsg('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name, username, phone, avatar });
      setMsg('✅ Profile updated!');
    } catch { setMsg('❌ Error saving profile.'); }
    finally { setSaving(false); }
  };

  const sendOtpEmail = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMsg('✅ Password reset email sent!');
    } catch { setMsg('❌ Could not send email.'); }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) return setMsg('❌ Passwords do not match.');
    if (newPw.length < 6) return setMsg('❌ Password must be at least 6 characters.');
    setSaving(true); setMsg('');
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      setMsg('✅ Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setMsg('❌ Current password is incorrect.'); }
    finally { setSaving(false); }
  };

  const enrolledCourses = courses.filter(c => userData?.enrolledCourses?.includes(c.id));

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-12 pt-24 pb-16">

        {/* Top bar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            {avatar
              ? <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
              : <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/30">
                  {name?.[0] || '?'}
                </div>
            }
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{name || currentUser.email}</h1>
            <p className="text-gray-400 text-sm">@{username}</p>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="ml-auto flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-48 shrink-0 hidden sm:block">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-colors ${tab === t.id ? 'bg-primary/15 text-white border border-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* Message */}
            {msg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                {msg}
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-5">My Learning</h2>
                {enrolledCourses.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
                    <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No courses enrolled yet</p>
                    <button onClick={() => navigate('/courses')} className="bg-primary text-white font-bold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors text-sm">
                      Browse Courses
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {enrolledCourses.map(course => {
                      const progress = userData?.progress?.[course.id] || 0;
                      return (
                        <div key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                          className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all">
                          <div className="relative aspect-video">
                            {course.image
                              ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-primary/10" />
                            }
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-white font-semibold text-sm line-clamp-1">{course.title}</p>
                            <p className="text-gray-400 text-xs mt-1">{progress}% complete</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subscription info */}
                {userData?.subscription && (
                  <div className="mt-6 bg-card border border-primary/20 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-2">Active Subscription</h3>
                    <p className="text-primary font-semibold">{userData.subscription.plan}</p>
                    <p className="text-gray-400 text-sm">Expires: {userData.subscription.expiresAt || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-5">My Profile</h2>
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">

                  {/* Avatar Upload */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      {avatar
                        ? <img src={avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-primary/30" />
                        : <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{name?.[0] || '?'}</div>
                      }
                      <label className="flex items-center gap-2 cursor-pointer bg-background border border-border border-dashed text-gray-400 hover:border-primary hover:text-primary rounded-lg px-4 py-2 text-sm transition-colors">
                        <Upload className="w-4 h-4" /> Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadToCloudinary(file, 'nourishmind/avatars');
                            setAvatar(url);
                          } catch { alert('Upload failed'); }
                        }} />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</label>
                    <input value={username} onChange={e => setUsername(e.target.value)}
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                    <input value={currentUser.email} disabled
                      className="bg-background/50 border border-border text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+201012345678"
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                  </div>

                  <button onClick={saveProfile} disabled={saving}
                    className="self-start bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-5">Security</h2>
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 mb-4">
                  <h3 className="text-white font-bold">Change Password</h3>
                  <div className="flex flex-col gap-3">
                    <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password"
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password"
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password"
                      className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                    <button onClick={changePassword} disabled={saving}
                      className="self-start bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : 'Change Password'}
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-2">Reset via Email OTP</h3>
                  <p className="text-gray-400 text-sm mb-4">We'll send a reset link to <span className="text-white">{currentUser.email}</span></p>
                  <button onClick={sendOtpEmail} className="bg-white/10 border border-border text-gray-300 font-semibold px-5 py-2 rounded-xl hover:bg-white/20 transition-colors text-sm">
                    Send Reset Email
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
