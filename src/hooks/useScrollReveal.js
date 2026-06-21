import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal — returns a ref and a boolean `inView`.
 * When the element enters the viewport, inView becomes true (stays true).
 */
const useScrollReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // animate once only
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
};

export default useScrollReveal;
