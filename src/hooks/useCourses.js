import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CACHE_KEY = 'nm_courses_v1';

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeCache = (data) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
};

export const useCourses = () => {
  const cached = readCache();
  // If we have cached real data → show it instantly, no loading
  const [courses, setCourses] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(data);
        writeCache(data);
        setLoading(false);
      },
      () => {
        const unsub2 = onSnapshot(collection(db, 'courses'),
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(data);
            writeCache(data);
            setLoading(false);
          },
          () => { setLoading(false); }
        );
        return unsub2;
      }
    );
    return unsub;
  }, []);

  return { courses, loading };
};
