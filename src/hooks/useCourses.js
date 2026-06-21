import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        // fallback without orderBy if index missing
        const unsub2 = onSnapshot(
          collection(db, 'courses'),
          (snap) => {
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
