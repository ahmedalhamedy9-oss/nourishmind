import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CATEGORIES as DEFAULT_CATS } from '@/lib/data';

export const useCategories = () => {
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'categories'),
      (snap) => {
        if (snap.exists() && snap.data().list?.length) {
          setCategories(snap.data().list);
        } else {
          setCategories(DEFAULT_CATS);
        }
        setLoading(false);
      },
      () => {
        setCategories(DEFAULT_CATS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { categories, loading };
};
