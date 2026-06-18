import React, { useEffect, useRef } from 'react';

// Removes black/dark background from logo image using canvas
const LogoCanvas = ({ src, height = 40, className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Scale canvas to match image aspect ratio
      const ratio = img.width / img.height;
      canvas.height = height * 2; // 2x for retina
      canvas.width = canvas.height * ratio;
      canvas.style.height = height + 'px';
      canvas.style.width = (height * ratio) + 'px';

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate luminance — dark pixels become transparent
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114);

        if (luminance < 40) {
          // Pure black → fully transparent
          data[i + 3] = 0;
        } else if (luminance < 80) {
          // Very dark → mostly transparent
          data[i + 3] = Math.round((luminance - 40) / 40 * 100);
        }
        // Bright pixels stay fully opaque
      }

      ctx.putImageData(imageData, 0, 0);
    };
    img.src = src;
  }, [src, height]);

  return <canvas ref={canvasRef} className={className} />;
};

export default LogoCanvas;
