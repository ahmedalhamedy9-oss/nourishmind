import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ✅ Set your admin email here
const ADMIN_EMAIL = 'ahmedalhamedy9@gmail.com';

/* Derive whether an account is blocked from its user doc.
 * Admin is never blocked. A temporary pause auto-expires after pausedUntil. */
function computeBlock(userData, isAdmin) {
  if (isAdmin || !userData) return { blocked: false };
  const s = userData.status;
  if (s === 'suspended') return { blocked: true, kind: 'suspended' };
  if (s === 'deleted') return { blocked: true, kind: 'deleted' };
  if (s === 'paused') {
    const until = userData.pausedUntil ? new Date(userData.pausedUntil) : null;
    if (!until || until.getTime() > Date.now()) return { blocked: true, kind: 'paused', until };
    return { blocked: false }; // pause window has passed → treat as active
  }
  return { blocked: false };
}

/* Full-screen block shown in place of the entire app for blocked users. */
function AccountBlocked({ block, email, onLogout }) {
  const until = block.until ? new Date(block.until).toLocaleDateString('ar-EG') : null;
  const title = block.kind === 'paused' ? 'الحساب موقوف مؤقتاً'
    : block.kind === 'deleted' ? 'تم إلغاء الحساب' : 'الحساب موقوف';
  const msg = block.kind === 'paused'
    ? `تم إيقاف حسابك مؤقتاً${until ? ` حتى ${until}` : ''}. لن تتمكن من الدخول حتى انتهاء المدة.`
    : block.kind === 'deleted'
      ? 'تم إلغاء هذا الحساب. للاستفسار تواصل مع الإدارة.'
      : 'تم إيقاف حسابك. للاستفسار تواصل مع الإدارة.';
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1412] p-4" dir="rtl">
      <div className="bg-[#0d1a17] border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">⛔</div>
        <p className="text-white font-bold text-xl mb-2">{title}</p>
        <p className="text-gray-400 text-sm mb-2">{msg}</p>
        {email && <p className="text-gray-600 text-xs mb-6">{email}</p>}
        <button onClick={onLogout} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">تسجيل الخروج</button>
      </div>
    </div>
  );
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Unsubscribe previous user listener
      if (unsubUser) { unsubUser(); unsubUser = null; }

      if (user) {
        // Live listener on user doc — picks up avatar/name changes immediately
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          setUserData(snap.exists() ? snap.data() : null);
          setLoading(false);
        }, () => setLoading(false));
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const signup = async (name, email, password, phone = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      phone,
      username: name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000),
      role: email === ADMIN_EMAIL ? 'admin' : 'student',
      avatar: '',
      status: 'active',
      enrolledCourses: [],
      subscription: null,
      progress: {},
      createdAt: new Date().toISOString(),
    });
    return cred;
  };

  const logout = () => signOut(auth);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const block = computeBlock(userData, isAdmin);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, login, signup, logout, isAdmin, isAuthenticated: !!currentUser, accountBlocked: block.blocked, accountStatus: block }}>
      {block.blocked ? <AccountBlocked block={block} email={currentUser?.email} onLogout={logout} /> : children}
    </AuthContext.Provider>
  );
};
