import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { siteConfig } from '../config';
import useLenis from '../hooks/useLenis';

import Hero from '../sections/Hero';
import About from '../sections/About';
import Exhibitions from '../sections/Exhibitions';
import Footer from '../sections/Footer';

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  isLoggedIn: boolean;
  onNavigate: (to: string, replace?: boolean) => void;
}

const LandingPage = ({ isLoggedIn, onNavigate }: LandingPageProps) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useLenis();

  useEffect(() => {
    if (siteConfig.language) {
      document.documentElement.lang = siteConfig.language;
    }
    if (siteConfig.title) {
      document.title = siteConfig.title;
    }
  }, []);

  useEffect(() => {
    const sections = [
      { selector: '#hero', color: '#8B7355' },
      { selector: '#about', color: '#2C2416' },
      { selector: '#exhibitions', color: '#3D3226' },
      { selector: '#footer', color: '#2C2416' },
    ];

    sections.forEach(({ selector, color }) => {
      const el = document.querySelector(selector);
      if (!el) return;

      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          gsap.to('body', {
            backgroundColor: color,
            duration: 0.6,
            ease: 'power2.out',
          });
        },
        onEnterBack: () => {
          gsap.to('body', {
            backgroundColor: color,
            duration: 0.6,
            ease: 'power2.out',
          });
        },
      });

      triggersRef.current.push(trigger);
    });

    return () => {
      triggersRef.current.forEach((t) => t.kill());
      triggersRef.current = [];
    };
  }, []);

  return (
    <div ref={mainRef} className="relative">
      <Hero isLoggedIn={isLoggedIn} onNavigate={onNavigate} />
      <About />
      <Exhibitions onNavigate={onNavigate} />
      <Footer />
    </div>
  );
};

export default LandingPage;
