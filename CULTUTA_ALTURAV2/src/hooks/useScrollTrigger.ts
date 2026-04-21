import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollTriggerConfig {
  trigger: string;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean;
  markers?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

export const useScrollTrigger = (config: ScrollTriggerConfig) => {
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    triggerRef.current = ScrollTrigger.create({
      trigger: config.trigger,
      start: config.start || 'top 80%',
      end: config.end || 'bottom 20%',
      scrub: config.scrub || false,
      pin: config.pin || false,
      markers: config.markers || false,
      onEnter: config.onEnter,
      onLeave: config.onLeave,
      onEnterBack: config.onEnterBack,
      onLeaveBack: config.onLeaveBack,
    });

    return () => {
      triggerRef.current?.kill();
    };
  }, [config]);

  return triggerRef;
};

export const useParallax = (
  selector: string,
  yPercent: number = 20,
  triggerSelector?: string
) => {
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    elements.forEach((el) => {
      tweenRef.current = gsap.to(el, {
        yPercent,
        ease: 'none',
        scrollTrigger: {
          trigger: triggerSelector || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    return () => {
      tweenRef.current?.scrollTrigger?.kill();
      tweenRef.current?.kill();
    };
  }, [selector, yPercent, triggerSelector]);
};

export default useScrollTrigger;
