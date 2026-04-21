import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroConfig } from '../config';
import { ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  isLoggedIn?: boolean;
  onNavigate?: (to: string, replace?: boolean) => void;
}

const Hero = ({ isLoggedIn = false, onNavigate }: HeroProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const btnLoginRef = useRef<HTMLButtonElement>(null);
  const btnExplorarRef = useRef<HTMLAnchorElement>(null);
  const titleMascaraRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  const isAuthLink = (label: string) => ['comunidad', 'iniciar sesión', 'iniciar sesion', 'registro'].includes(label.toLowerCase());
  const secondaryNavLinks = heroConfig.navLinks.filter((link) => !isAuthLink(link.label));

  // Función para envolver el texto y permitir animación por letra
  const renderWaveText = (text: string) => {
    return text.split('').map((char, index) => (
      <span key={index} className="wave-char inline-block cursor-default" style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}>
        {char}
      </span>
    ));
  };

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const nav = navRef.current;
    const logo = logoRef.current;
    const scrollIndicator = scrollIndicatorRef.current;
    const btnLogin = btnLoginRef.current;
    const btnExplorar = btnExplorarRef.current;

    if (!section || !content || !nav || !logo || !scrollIndicator) return;

    // Separate content children from buttons to avoid double animation
    const contentChildren = Array.from(content.children).filter(
      child => child !== btnExplorar
    );

    // Set initial states
    gsap.set(contentChildren, { opacity: 0, y: 40 });
    gsap.set(nav, { opacity: 0, y: -20 });
    gsap.set(logo, { opacity: 0, scale: 0.9 });
    gsap.set(scrollIndicator, { opacity: 0 });
    
    // Initial states for glass buttons
    if (btnExplorar) gsap.set(btnExplorar, { opacity: 0, y: 30, scale: 0.95 });
    if (btnLogin) gsap.set(btnLogin, { opacity: 0, scale: 0.95 });

    // Entrance timeline
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      delay: 0.2,
    });

    tl.to(nav, { opacity: 1, y: 0, duration: 0.8 })
      .to(logo, { opacity: 1, scale: 1, duration: 0.8 }, '-=0.6')
      .to(contentChildren, { opacity: 1, y: 0, duration: 1, stagger: 0.15 }, '-=0.4')
      .fromTo('.wave-char', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'back.out(2)' }, '-=0.8')
      // Specific entry for glass buttons with refined feel
      .to(btnLogin, { 
        opacity: 1, 
        scale: 1, 
        duration: 0.8, 
        ease: "power4.out" 
      }, "-=1")
      .to(btnExplorar, { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 1.2, 
        ease: "power4.out" 
      }, "-=0.6")
      .to(scrollIndicator, { opacity: 1, duration: 0.5 }, '-=0.3');

    // Idle "Breathing" and Hover Animations
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      [btnLogin, btnExplorar].forEach((btn, i) => {
        if (!btn) return;

        const isExplorar = i === 1;

        // 1. Idle breathing (very subtle)
        // Adjust duration (3-4s) for different rhythm between buttons
        gsap.to(btn, {
          y: "+=3",
          duration: 3 + i,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // 2. Hover logic: "Presión de cristal"
        const onHover = () => {
          gsap.to(btn, {
            scale: 1.05, // Aumentado ligeramente para mayor visibilidad
            y: -5, // Elevación clara al pasar el mouse
            boxShadow: "0 20px 40px rgba(0,0,0,0.4), inset 0 1px 6px rgba(255,255,255,0.8)",
            borderColor: "rgba(255,255,255,0.8)", // highlight border
            duration: 0.3,
            ease: "back.out(1.7)", // Efecto de "pop" más dinámico
            overwrite: true
          });
        };

        const onLeave = () => {
          gsap.to(btn, {
            scale: 1,
            y: 0,
            boxShadow: isExplorar 
              ? "inset 0 1px 2px rgba(255,255,255,0.6), 0 8px 24px rgba(0,0,0,0.3)" 
              : "none",
            borderColor: "rgba(255,255,255,0.2)",
            duration: 0.5,
            ease: "power2.inOut",
            overwrite: true
          });
        };

        const onClick = () => {
          gsap.to(btn, {
            scale: 0.95, // Compresión táctil
            duration: 0.1,
            ease: "power2.in",
            onComplete: () => {
              gsap.to(btn, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" }); // Rebote corto
            }
          });
        };

        btn.addEventListener('mouseenter', onHover);
        btn.addEventListener('mouseleave', onLeave);
        btn.addEventListener('mousedown', onClick);

        // 3. Specular light for Explorar project (every 7s)
        if (isExplorar) {
          const shine = btn.querySelector('.shine-effect');
          if (shine) {
            gsap.to(shine, {
              x: "200%",
              duration: 1.8,
              repeat: -1,
              repeatDelay: 6, // cinematic interval
              ease: "power2.inOut",
            });
          }
        }
      });

      // Continuous wave effect for the title
      gsap.to('.wave-char', {
        y: -18,
        scale: 1.08,
        color: '#fff8ef',
        duration: 1.2,
        stagger: {
          each: 0.08,
          repeat: -1,
          yoyo: true
        },
        ease: "sine.inOut",
        delay: 2
      });

      // Hover effect on each letter — darken via filter (doesn't conflict with wave)
      document.querySelectorAll('.wave-char').forEach((char) => {
        const el = char as HTMLElement;
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { filter: 'brightness(0.55)', duration: 0.2, ease: 'power2.out' });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { filter: 'brightness(1)', duration: 0.35, ease: 'power2.inOut' });
        });
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      // Version for reduced motion: only simple opacity hover
      [btnLogin, btnExplorar].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener('mouseenter', () => gsap.to(btn, { opacity: 0.8, duration: 0.3 }));
        btn.addEventListener('mouseleave', () => gsap.to(btn, { opacity: 1, duration: 0.3 }));
      });
    });

    // Scroll parallax
    const scrollTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(content, { y: p * 100 });
        gsap.set(logo, { y: p * 50 });
      },
    });
    triggersRef.current.push(scrollTrigger);

    return () => {
      triggersRef.current.forEach((t) => t.kill());
      triggersRef.current = [];
      tl.kill();
    };
  }, []);

  if (!heroConfig.brandLeft && !heroConfig.brandRight) return null;

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-screen w-full overflow-hidden"
      style={{ backgroundColor: '#a68a6d' }}
    >
      {/* Navigation */}
      <nav
        ref={navRef}
        className="absolute top-0 left-0 w-full z-50 px-4 md:px-8 lg:px-16 py-5 md:py-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div ref={logoRef}>
            <img
              src={heroConfig.heroImage}
              alt={heroConfig.heroImageAlt}
              className="w-20 md:w-28 lg:w-32 h-auto opacity-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-8 lg:gap-10">
          <button
            ref={btnLoginRef}
            type="button"
            onClick={() => onNavigate?.(isLoggedIn ? '/comunidad' : '/login')}
            className="btn-login login-nav-cta h-9 px-5 md:px-7 rounded-full border border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold text-[9px] md:text-[10px] uppercase tracking-[0.25em] relative overflow-hidden transition-all duration-300 inline-flex items-center justify-center"
          >
            {isLoggedIn ? 'Comunidad' : 'Iniciar Sesión'}
            <div className="shine-effect absolute inset-0 -translate-x-[150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          </button>

          {secondaryNavLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className="hidden md:inline-flex h-9 items-center font-semibold text-white/80 hover:text-white uppercase tracking-[0.25em] transition-colors text-[9px] md:text-[10px]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content - centered */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pt-10">
        <div ref={contentRef} className="text-center max-w-5xl w-full flex flex-col items-center relative">
          
          {/* Badge */}
          <div className="text-white/70 text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase mb-6">
            APRENDE Y COMPARTE LA HISTORIA DE TULANCINGO
          </div>
          
          {/* Main headline */}
          <div 
            ref={titleMascaraRef}
            className="flex flex-col items-center w-full"
          >
            <h1 
              className="font-black text-[12vw] md:text-[9vw] lg:text-[7.5vw] leading-[0.9] text-white tracking-tight m-0 flex justify-center"
              style={{
                textShadow: `
                  1px 1px 0px #b1947b,
                  2px 2px 0px #b1947b,
                  3px 3px 0px #b1947b,
                  4px 4px 0px #b1947b,
                  5px 5px 0px #b1947b,
                  6px 6px 0px #b1947b,
                  7px 7px 0px #b1947b,
                  8px 8px 0px #b1947b,
                  10px 10px 20px rgba(0,0,0,0.25)
                `
              }}
            >
              {renderWaveText("¡CULTURA")}
            </h1>
            <h1 
              className="font-black text-[12vw] md:text-[9vw] lg:text-[7.5vw] leading-[0.9] text-white tracking-tight m-0 mt-1 md:mt-2 flex justify-center w-full"
              style={{
                textShadow: `
                  1px 1px 0px #b1947b,
                  2px 2px 0px #b1947b,
                  3px 3px 0px #b1947b,
                  4px 4px 0px #b1947b,
                  5px 5px 0px #b1947b,
                  6px 6px 0px #b1947b,
                  7px 7px 0px #b1947b,
                  8px 8px 0px #b1947b,
                  10px 10px 20px rgba(0,0,0,0.25)
                `
              }}
            >
              {renderWaveText("EN ALTURA!")}
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-white/80 text-sm md:text-[15px] font-medium tracking-wide mt-12 mb-8">
            Tulancingo, Hidalgo
          </p>
          
          {/* CTA Button */}
          <a 
            ref={btnExplorarRef}
            href="#about"
            className="btn-explorar relative overflow-hidden inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-white/20 bg-transparent hover:bg-white/5 hover:border-white/40 transition-all duration-300 font-semibold text-[10px] md:text-xs uppercase tracking-[0.2em] text-white"
          >
            EXPLORAR PROYECTO
            <div className="shine-effect absolute inset-0 -translate-x-[150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="font-semibold text-white/60 text-[9px] md:text-[10px] uppercase tracking-[0.25em]">{heroConfig.scrollText}</span>
        <ChevronDown className="w-4 h-4 text-white/50 animate-bounce" strokeWidth={1} />
      </div>
    </section>
  );
};

export default Hero;
