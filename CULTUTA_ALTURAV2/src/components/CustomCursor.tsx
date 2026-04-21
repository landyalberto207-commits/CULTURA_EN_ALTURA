import React, { useEffect, useState } from 'react';
import { useCustomCursor } from '../hooks/useCustomCursor';

export const CustomCursor: React.FC = () => {
  const { cursorRef } = useCustomCursor();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouchDevice(media.matches);

    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
    } else if (typeof media.addListener === 'function') {
      media.addListener(update);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', update);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(update);
      }
    };
  }, []);

  if (isTouchDevice) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      id="custom-cursor"
      className="fixed pointer-events-none z-[9999] rounded-full"
      style={{
        width: '12px',
        height: '12px',
        backgroundColor: '#ffffff',
        mixBlendMode: 'difference',
        transform: 'translate(-50%, -50%)',
        willChange: 'left, top, width, height'
      }}
    />
  );
};

export default CustomCursor;
