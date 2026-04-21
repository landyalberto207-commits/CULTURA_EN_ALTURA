import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const useCustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouchPointer = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchPointer) {
      document.documentElement.style.cursor = 'auto';
      return;
    }

    const cursor = cursorRef.current;
    if (!cursor) return;

    // Ocultar el cursor por defecto
    document.documentElement.style.cursor = 'none';

    // Configurar el movimiento fluido con quickTo para mejor rendimiento
    const onMouseMove = (e: MouseEvent) => {
      // Movimiento instantáneo puro usando coordenadas del mouse en una capa fija
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    };

    // Manejadores para eventos personalizados (Spotlight)
    const onExpand = (e: any) => {
      const { scale, text, color, blendMode } = e.detail || { scale: 15 };
      gsap.to(cursor, { 
        scale: scale, 
        duration: 0.5, 
        ease: "power2.out",
        backgroundColor: color || "#ffffff",
        mixBlendMode: blendMode || "difference"
      });
      if (text) {
        cursor.innerHTML = `<div class="spotlight-text" style="color: black; font-size: 1px; text-align: center; font-family: 'MuseoHeadline', serif; width: 100%; display: flex; align-items: center; justify-content: center; height: 100%; padding: 2px;">${text}</div>`;
        gsap.to(".spotlight-text", { opacity: 1, duration: 0.3 });
      } else {
        cursor.innerHTML = '';
      }
    };

    const onReset = () => {
      gsap.to(cursor, { 
        scale: 1, 
        duration: 0.4, 
        ease: "power2.out",
        backgroundColor: "#ffffff",
        mixBlendMode: "difference"
      });
      cursor.innerHTML = '';
    };

    // Efecto de crecimiento al pasar sobre elementos interactivos
    const resetCursorState = () => {
      if (cursor) {
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.backgroundColor = '#ffffff';
        cursor.style.mixBlendMode = 'difference';
        cursor.innerHTML = '';
      }
    };

    const onMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.tagName) return;

      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('interactive');

      if (isInteractive) {
        cursor.style.transition = 'width 0.2s ease-out, height 0.2s ease-out';
        cursor.style.width = '30px';
        cursor.style.height = '30px';
      }
    };

    const onMouseLeave = () => {
      resetCursorState();
    };

    // Escuchar cambios de visibilidad o foco para resetear el cursor
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetCursorState();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseEnter);
    document.addEventListener('mouseout', onMouseLeave);
    window.addEventListener('blur', resetCursorState);
    window.addEventListener('focus', resetCursorState);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('cursor-expand', onExpand as EventListener);
    window.addEventListener('cursor-reset', onReset as EventListener);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseEnter);
      document.removeEventListener('mouseout', onMouseLeave);
      window.removeEventListener('blur', resetCursorState);
      window.removeEventListener('focus', resetCursorState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('cursor-expand', onExpand as EventListener);
      window.removeEventListener('cursor-reset', onReset as EventListener);
      document.documentElement.style.cursor = 'auto';
    };
  }, []);

  return { cursorRef };
};

export default useCustomCursor;
