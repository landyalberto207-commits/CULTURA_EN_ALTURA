import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { aboutConfig } from '../config';
import { History, Box } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  if (!aboutConfig.headline) return null;

  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    const info = infoRef.current;

    if (!section || !text || !info) return;

    // Text reveal
    const textElements = text.querySelectorAll('.reveal-text');
    textElements.forEach((el) => {
      gsap.set(el, { opacity: 0, y: 30 });
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true });
        },
        onLeave: () => {
          gsap.to(el, { opacity: 0, y: -30, duration: 0.8, ease: 'power3.out', overwrite: true });
        },
        onEnterBack: () => {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true });
        },
        onLeaveBack: () => {
          gsap.to(el, { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', overwrite: true });
        },
      });
      triggersRef.current.push(trigger);
    });

    // Info cards reveal
    const infoCards = info.querySelectorAll('.info-card');
    infoCards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 40 });
      const trigger = ScrollTrigger.create({
        trigger: card,
        start: 'top 90%',
        onEnter: () => {
          gsap.to(card, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.15, ease: 'power3.out', overwrite: true });
        },
        onLeave: () => {
          gsap.to(card, { opacity: 0, y: -40, duration: 0.7, delay: i * 0.15, ease: 'power3.out', overwrite: true });
        },
        onEnterBack: () => {
          gsap.to(card, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.15, ease: 'power3.out', overwrite: true });
        },
        onLeaveBack: () => {
          gsap.to(card, { opacity: 0, y: 40, duration: 0.7, delay: i * 0.15, ease: 'power3.out', overwrite: true });
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
    <section
      id="about"
      ref={sectionRef}
      className="relative w-full py-20 lg:py-28"
      style={{ backgroundColor: '#2C2416' }}
    >
      {/* Main headline */}
      <div ref={textRef} className="max-w-4xl mx-auto px-6 lg:px-12 mb-16 text-center">
        <h2 className="reveal-text museo-headline text-white text-3xl md:text-4xl lg:text-5xl mb-6">
          {aboutConfig.headline}
        </h2>
        <p className="reveal-text museo-body text-white/60 text-base md:text-lg max-w-2xl mx-auto">
          {aboutConfig.description}
        </p>
      </div>

      {/* Info cards - History & Project */}
      <div ref={infoRef} className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* History card */}
          <div className="info-card p-8 lg:p-10 rounded-3xl bg-transparent border border-white/20 backdrop-blur-3xl shadow-[inset_0_1px_4px_rgba(255,255,255,0.2),_0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-white/30 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-6 h-6 text-white/70" />
              <h3 className="museo-headline text-white text-xl">{aboutConfig.historyTitle}</h3>
            </div>
            <p className="museo-body text-white/60 text-sm leading-relaxed">
              {aboutConfig.historyText}
            </p>
          </div>

          {/* Project card */}
          <div className="info-card p-8 lg:p-10 rounded-3xl bg-transparent border border-white/20 backdrop-blur-3xl shadow-[inset_0_1px_4px_rgba(255,255,255,0.2),_0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-white/30 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <Box className="w-6 h-6 text-white/70" />
              <h3 className="museo-headline text-white text-xl">{aboutConfig.projectTitle}</h3>
            </div>
            <p className="museo-body text-white/60 text-sm leading-relaxed">
              {aboutConfig.projectText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
