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

const ADMIN_EMAIL = 'ahmedalhamedy9@gmail.com';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = not checked yet
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // null = logged out, User = logged in
      if (unsubUser) { unsubUser(); unsubUser = null; }

      if (user) {
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

  // KEY FIX: render children immediately — don't block on auth loading
  // Components that need auth use `currentUser === undefined` to know if still checking
  return (
    <AuthContext.Provider value={{
      currentUser: currentUser === undefined ? null : currentUser,
      userData,
      loading,
      authChecked: currentUser !== undefined,
      login,
      signup,
      logout,
      isAdmin,
      isAuthenticated: !!currentUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
