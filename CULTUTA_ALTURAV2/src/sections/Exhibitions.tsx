import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { exhibitionsConfig } from '../config';
import { Capacitor } from '@capacitor/core';

gsap.registerPlugin(ScrollTrigger);

interface ExhibitionsProps {
  onNavigate?: (to: string, replace?: boolean) => void;
}

const Exhibitions = ({ onNavigate }: ExhibitionsProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);
  
  // Direct mobile detection without hook delay
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const showVrArCta = isMobileUA || isTouchDevice || Capacitor.isNativePlatform();

  if (!exhibitionsConfig.headline && exhibitionsConfig.exhibitions.length === 0) return null;

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const grid = gridRef.current;

    if (!section || !header || !grid) return;

    // Header reveal
    gsap.set(header.children, { opacity: 0, y: 30 });
    const headerTrigger = ScrollTrigger.create({
      trigger: header,
      start: 'top 85%',
      onEnter: () => {
        gsap.to(header.children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onLeave: () => {
        gsap.to(header.children, { opacity: 0, y: -30, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onEnterBack: () => {
        gsap.to(header.children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onLeaveBack: () => {
        gsap.to(header.children, { opacity: 0, y: 30, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
    });
    triggersRef.current.push(headerTrigger);

    // Cards reveal
    const cards = grid.querySelectorAll('.exhibit-card');
    cards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 40 });
      const trigger = ScrollTrigger.create({
        trigger: card,
        start: 'top 90%',
        onEnter: () => {
          gsap.to(card, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.1, ease: 'power3.out', overwrite: true });
        },
        onLeave: () => {
          gsap.to(card, { opacity: 0, y: -40, duration: 0.7, delay: i * 0.1, ease: 'power3.out', overwrite: true });
        },
        onEnterBack: () => {
          gsap.to(card, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.1, ease: 'power3.out', overwrite: true });
        },
        onLeaveBack: () => {
          gsap.to(card, { opacity: 0, y: 40, duration: 0.7, delay: i * 0.1, ease: 'power3.out', overwrite: true });
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
      id="exhibitions"
      ref={sectionRef}
      className="relative w-full py-24 lg:py-32 px-6 lg:px-12"
      style={{ backgroundColor: '#3D3226' }}
    >
      {/* Section Header */}
      <div ref={headerRef} className="max-w-4xl mx-auto mb-12 text-center">
        <p className="museo-label text-white/40 text-[10px] mb-4 tracking-[0.2em]">
          CONOCE NUESTRO PATRIMONIO
        </p>
        <h2 className="museo-headline text-white text-3xl md:text-4xl lg:text-5xl mb-4">
          {exhibitionsConfig.headline}
        </h2>
        <p className="museo-body text-white/50 text-sm max-w-xl mx-auto">
          Descubre los sitios históricos que hacen de Tulancingo un destino cultural único en el estado de Hidalgo.
        </p>
      </div>

      {/* Exhibition Grid — 1 featured + 2 below */}
      <div ref={gridRef} className="max-w-5xl mx-auto flex flex-col gap-5">
        {/* Featured: Catedral (first item) */}
        {exhibitionsConfig.exhibitions.slice(0, 1).map((exhibit) => {
          const hasModel = exhibit.id === 1;
          return (
            <div
              key={exhibit.id}
              className={`exhibit-card group relative overflow-hidden rounded-2xl ${hasModel ? 'cursor-pointer' : ''}`}
              onClick={() => { if (hasModel) onNavigate?.('/recorrido/catedral'); }}
            >
              <div className="relative aspect-[3/4] sm:aspect-[16/7] md:aspect-[21/9] overflow-hidden">
                <img src={exhibit.image} alt={exhibit.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
                <p className="museo-label text-white/50 mb-1 text-[10px]">{exhibit.subtitle}</p>
                <h3 className="museo-headline text-white text-xl md:text-2xl lg:text-3xl mb-2">{exhibit.title}</h3>
                <p className="museo-body text-white/60 text-sm leading-relaxed max-w-lg hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">{exhibit.description}</p>
                {hasModel && (
                  <div className="mt-4 flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onNavigate?.('/recorrido/catedral'); }}
                      className="px-3 py-2 rounded-full border border-white/35 bg-black/25 hover:bg-black/40 text-[10px] uppercase tracking-[0.15em] text-white/95">
                      Ver Recorrido
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Secondary: remaining items side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exhibitionsConfig.exhibitions.slice(1).map((exhibit) => {
            const route = exhibit.id === 2 ? '/recorrido/ferrocarril' : '/recorrido/piramides';
            return (
              <div key={exhibit.id} className="exhibit-card group relative overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => onNavigate?.(route)}>
                <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
                  <img src={exhibit.image} alt={exhibit.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 w-full p-5">
                  <p className="museo-label text-white/50 mb-1 text-[10px]">{exhibit.subtitle}</p>
                  <h3 className="museo-headline text-white text-lg md:text-xl mb-2">{exhibit.title}</h3>
                  <p className="museo-body text-white/60 text-xs leading-relaxed sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    {exhibit.description}
                  </p>
                  <div className="mt-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <span className="px-3 py-2 rounded-full border border-white/35 bg-black/25 text-[10px] uppercase tracking-[0.15em] text-white/95">
                      Ver recorrido
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* World View CTA */}
      <div className="max-w-5xl mx-auto mt-12 text-center">
        <button
          type="button"
          onClick={() => onNavigate?.('/mundo')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-white text-xs uppercase tracking-[0.2em] font-semibold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Explorar Experiencias Mundiales
        </button>
      </div>

    </section>
  );
};

export default Exhibitions;
