import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CACHE_KEY = 'nm_courses_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full — ignore */ }
};

export const useCourses = () => {
  const cached = readCache();
  const [courses, setCourses] = useState(cached || []);
  const [loading, setLoading] = useState(!cached); // if cache exists → no loading flash

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(data);
        writeCache(data);
        setLoading(false);
      },
      () => {
        // fallback without orderBy if index missing
        const unsub2 = onSnapshot(
          collection(db, 'courses'),
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(data);
            writeCache(data);
            setLoading(false);
          },
          () => { setCourses([]); setLoading(false); }
        );
        return unsub2;
      }
    );
    return unsub;
  }, []);

  return { courses, loading };
};
