import React from 'react';
import useScrollReveal from '@/hooks/useScrollReveal';

/**
 * RevealSection — wraps any content with a fade-in + slide-up animation
 * when it enters the viewport. Zero dependencies beyond React.
 *
 * Props:
 *   delay    — ms delay before animation starts (default 0)
 *   duration — animation duration in ms (default 600)
 *   y        — starting translateY in px (default 28)
 *   className / style — passed to the wrapper div
 */
const RevealSection = ({
  children,
  delay    = 0,
  duration = 600,
  y        = 28,
  className = '',
  style     = {},
}) => {
  const { ref, inView } = useScrollReveal(0.12);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    inView ? 1 : 0,
        transform:  inView ? 'translateY(0px)' : `translateY(${y}px)`,
        transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default RevealSection;
