import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PLACEHOLDER_COURSES } from '@/lib/data';

export const useCourses = () => {
  const [courses, setCourses] = useState(PLACEHOLDER_COURSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try ordered query first (requires Firestore index on createdAt)
    // If index doesn't exist yet, fall back to unordered query
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCourses(snap.empty
          ? PLACEHOLDER_COURSES
          : snap.docs.map(d => ({ id: d.id, ...d.data() }))
        );
        setLoading(false);
      },
      async (err) => {
        // Index missing — fall back to unordered snapshot
        if (err.code === 'failed-precondition' || err.code === 'unimplemented') {
          const fallback = onSnapshot(
            collection(db, 'courses'),
            (snap) => {
              setCourses(snap.empty
                ? PLACEHOLDER_COURSES
                : snap.docs.map(d => ({ id: d.id, ...d.data() }))
              );
              setLoading(false);
            },
            () => {
              setCourses(PLACEHOLDER_COURSES);
              setLoading(false);
            }
          );
          return fallback;
        }
        // Any other error — use placeholders
        setCourses(PLACEHOLDER_COURSES);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { courses, loading };
};
