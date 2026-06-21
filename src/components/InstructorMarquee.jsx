import React from 'react';

const InstructorMarquee = ({ instructors = [] }) => {
  if (!instructors.length) return null;

  // Triple the array for seamless infinite loop
  const items = [...instructors, ...instructors, ...instructors];

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
      padding: '20px 0',
    }}>
      {/* Fade edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 120,
        background: 'linear-gradient(90deg, #090e1a 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
        background: 'linear-gradient(270deg, #090e1a 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Scrolling track */}
      <div style={{
        display: 'flex',
        gap: 16,
        animation: 'marquee-instructors 35s linear infinite',
        width: 'max-content',
      }}>
        {items.map((inst, i) => (
          <div key={i} style={{
            flexShrink: 0,
            width: 130,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}>
            {/* Portrait image — 2:3 ratio */}
            <div style={{
              width: 130,
              height: 195,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1.5px solid rgba(201,168,76,0.2)',
              background: 'rgba(255,255,255,0.04)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {inst.image ? (
                <img
                  src={inst.image}
                  alt={inst.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 40, color: 'rgba(201,168,76,0.5)',
                  fontWeight: 700,
                }}>
                  {inst.name?.[0] || '?'}
                </div>
              )}
            </div>
            {/* Name + title */}
            <div style={{ textAlign: 'center', padding: '0 4px' }}>
              <p style={{
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                margin: 0,
                lineHeight: 1.3,
              }}>
                {inst.name}
              </p>
              {inst.title && (
                <p style={{
                  color: 'rgba(201,168,76,0.8)',
                  fontSize: 10,
                  fontFamily: "'Outfit', sans-serif",
                  margin: '3px 0 0',
                  lineHeight: 1.3,
                }}>
                  {inst.title}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee-instructors {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default InstructorMarquee;
