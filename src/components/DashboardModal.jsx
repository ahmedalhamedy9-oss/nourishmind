import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Lock, BookOpen, Upload, Check, LogOut } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';

const TABS = [
  { id: 'overview', label: 'My Learning', icon: BookOpen },
  { id: 'profile',  label: 'My Profile',  icon: User },
  { id: 'security', label: 'Security',    icon: Lock },
];

const DashboardModal = ({ onClose }) => {
  const { currentUser, userData, logout } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  const [tab, setTab]           = useState('overview');
  const [localData, setLocalData] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  // Profile fields
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone]       = useState('');
  const [avatar, setAvatar]     = useState('');
  const [uploading, setUploading] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');

  // Load user data from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setLocalData(d);
        setName(d.name || '');
        setUsername(d.username || '');
        setPhone(d.phone || '');
        setAvatar(d.avatar || '');
      }
    };
    load();
  }, [currentUser]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const saveProfile = async () => {
    setSaving(true); setMsg('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name, username, phone, avatar });
      setMsg('✅ Profile updated!');
    } catch { setMsg('❌ Error saving profile.'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'nourishmind/avatars');
      setAvatar(url);
      // Save immediately to Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: url });
      setMsg('✅ Photo updated!');
    } catch { setMsg('❌ Upload failed.'); }
    finally { setUploading(false); }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) return setMsg('❌ Passwords do not match.');
    if (newPw.length < 6) return setMsg('❌ Min 6 characters.');
    setSaving(true); setMsg('');
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      setMsg('✅ Password changed!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setMsg('❌ Current password is incorrect.'); }
    finally { setSaving(false); }
  };

  const sendResetEmail = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMsg('✅ Reset email sent!');
    } catch { setMsg('❌ Could not send email.'); }
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  const enrolledCourses = courses.filter(c => localData?.enrolledCourses?.includes(c.id));

  const displayAvatar = avatar || userData?.avatar || currentUser?.photoURL;
  const displayName   = name || userData?.name || currentUser?.displayName || currentUser?.email;
  const initials      = (displayName?.[0] || 'U').toUpperCase();

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      {/* Modal box */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl"
        style={{ background: '#0a1412', border: '1px solid rgba(74,155,142,0.2)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-4 px-5 py-4 border-b shrink-0" style={{ borderColor: 'rgba(74,155,142,0.15)' }}>
          {/* Avatar */}
          <div className="relative shrink-0">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-11 h-11 rounded-full object-cover border-2 border-primary/40" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-lg">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{displayName}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(200,230,225,0.45)' }}>{currentUser?.email}</p>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
          >
            <LogOut size={13} /> Logout
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors ml-1"
            style={{ color: 'rgba(200,230,225,0.5)', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,230,225,0.5)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-0 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMsg(''); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
              style={{
                color: tab === t.id ? '#5fbfb0' : 'rgba(200,230,225,0.5)',
                borderColor: tab === t.id ? '#5fbfb0' : 'transparent',
                background: tab === t.id ? 'rgba(74,155,142,0.08)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div className="h-px w-full" style={{ background: 'rgba(74,155,142,0.12)' }} />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Message */}
          {msg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {msg}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              {enrolledCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <BookOpen className="w-10 h-10 mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm mb-4" style={{ color: 'rgba(200,230,225,0.4)' }}>No courses enrolled yet</p>
                  <button
                    onClick={() => { onClose(); navigate('/courses'); }}
                    className="text-sm font-bold px-5 py-2 rounded-xl transition-colors"
                    style={{ background: 'linear-gradient(135deg, #4a9b8e, #3d7a6e)', color: '#fff' }}
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrolledCourses.map(course => {
                    const progress = localData?.progress?.[course.id] || 0;
                    return (
                      <div
                        key={course.id}
                        onClick={() => { onClose(); navigate(`/course/${course.id}/learn`); }}
                        className="rounded-xl overflow-hidden cursor-pointer transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,155,142,0.15)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,155,142,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(74,155,142,0.15)'}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          <div className="absolute inset-0">
                            {course.image
                              ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full" style={{ background: 'rgba(74,155,142,0.1)' }} />
                            }
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#4a9b8e,#5fbfb0)' }} />
                        </div>
                        <div className="p-3">
                          <p className="text-white font-semibold text-sm line-clamp-1">{course.title}</p>
                          <p className="text-xs mt-1" style={{ color: 'rgba(200,230,225,0.45)' }}>{progress}% complete</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Subscription */}
              {localData?.subscription && (
                <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(74,155,142,0.07)', border: '1px solid rgba(74,155,142,0.2)' }}>
                  <p className="text-white font-bold text-sm mb-1">Active Subscription</p>
                  <p className="font-semibold text-sm" style={{ color: '#5fbfb0' }}>{localData.subscription.plan}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(200,230,225,0.45)' }}>
                    Expires: {localData.subscription.expiresAt || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div className="flex flex-col gap-5 max-w-md">

              {/* Avatar */}
              <div className="flex items-center gap-4">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary/40 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                    {initials}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-sm px-4 py-2 rounded-lg transition-colors"
                  style={{ border: '1px dashed rgba(74,155,142,0.4)', color: uploading ? '#5fbfb0' : 'rgba(200,230,225,0.6)' }}>
                  <Upload size={14} />
                  {uploading ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>

              {/* Fields */}
              {[
                { label: 'Full Name', value: name, set: setName, type: 'text' },
                { label: 'Username', value: username, set: setUsername, type: 'text' },
                { label: 'Phone', value: phone, set: setPhone, type: 'tel', placeholder: '+201012345678' },
              ].map(({ label, value, set, type, placeholder }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(200,230,225,0.45)' }}>{label}</label>
                  <input
                    type={type} value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,155,142,0.2)' }}
                    onFocus={e => e.target.style.borderColor = '#5fbfb0'}
                    onBlur={e => e.target.style.borderColor = 'rgba(74,155,142,0.2)'}
                  />
                </div>
              ))}

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(200,230,225,0.45)' }}>Email</label>
                <input
                  value={currentUser?.email || ''} disabled
                  className="rounded-lg px-3 py-2.5 text-sm cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(200,230,225,0.35)' }}
                />
              </div>

              <button
                onClick={saveProfile} disabled={saving}
                className="self-start flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4a9b8e, #3d7a6e)', color: '#fff' }}
              >
                <Check size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div className="flex flex-col gap-5 max-w-md">
              <div className="flex flex-col gap-3 p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,155,142,0.12)' }}>
                <p className="text-white font-bold text-sm">Change Password</p>
                {[
                  { label: 'Current password', value: currentPw, set: setCurrentPw },
                  { label: 'New password', value: newPw, set: setNewPw },
                  { label: 'Confirm new password', value: confirmPw, set: setConfirmPw },
                ].map(({ label, value, set }) => (
                  <input
                    key={label} type="password" value={value}
                    onChange={e => set(e.target.value)} placeholder={label}
                    className="rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,155,142,0.2)' }}
                    onFocus={e => e.target.style.borderColor = '#5fbfb0'}
                    onBlur={e => e.target.style.borderColor = 'rgba(74,155,142,0.2)'}
                  />
                ))}
                <button
                  onClick={changePassword} disabled={saving}
                  className="self-start text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #4a9b8e, #3d7a6e)', color: '#fff' }}
                >
                  {saving ? 'Saving...' : 'Change Password'}
                </button>
              </div>

              <div className="flex flex-col gap-3 p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,155,142,0.12)' }}>
                <p className="text-white font-bold text-sm">Reset via Email</p>
                <p className="text-xs" style={{ color: 'rgba(200,230,225,0.45)' }}>
                  We'll send a reset link to <span style={{ color: 'rgba(200,230,225,0.8)' }}>{currentUser?.email}</span>
                </p>
                <button
                  onClick={sendResetEmail}
                  className="self-start text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,230,225,0.8)', cursor: 'pointer' }}
                >
                  Send Reset Email
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DashboardModal;
