import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LS_KEY = 'nm_courses_v1';

const fromLS = () => {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const toLS = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

export const useCourses = () => {
  const cached = fromLS();
  const [courses, setCourses] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(data);
        toLS(data);
        setLoading(false);
      },
      () => {
        const unsub2 = onSnapshot(collection(db, 'courses'),
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(data);
            toLS(data);
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
