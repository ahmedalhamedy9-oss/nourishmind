import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LS_KEY = 'nm_courses_v2';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const readCache = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
};

export const useCourses = () => {
  const cached = readCache();
  const [courses, setCourses] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

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
        // fallback without orderBy
        const unsub2 = onSnapshot(
          collection(db, 'courses'),
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
