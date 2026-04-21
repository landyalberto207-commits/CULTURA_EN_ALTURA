import { footerConfig } from '../config';
import { MapPin, Mail } from 'lucide-react';

const Footer = () => {
  if (!footerConfig.brandName) return null;

  return (
    <footer id="footer" className="relative w-full py-12 lg:py-16 px-6 lg:px-12" style={{ backgroundColor: '#2C2416' }}>
      {/* Background marquee band */}
      <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none opacity-10">
        <div className="marquee-row pb-8">
          <div className="marquee-track museo-headline text-white uppercase font-black text-8xl sm:text-[10rem] lg:text-[15rem] tracking-[0.25em]">
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
          </div>
          <div className="marquee-track museo-headline text-white uppercase font-black text-8xl sm:text-[10rem] lg:text-[15rem] tracking-[0.25em]" aria-hidden="true">
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
            <span>¡Cultura en Altura!</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto pt-28 md:pt-40">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-12 mb-16">
          <div className="max-w-lg space-y-3">
            <h3 className="museo-headline text-white text-xl">
              {footerConfig.brandName}
            </h3>
            <p className="museo-body text-white/60 text-sm leading-relaxed">
              {footerConfig.description}
            </p>
          </div>

          <div className="space-y-3 text-white/70 text-sm">
            <p className="museo-label uppercase tracking-[0.2em] text-white/50 text-[11px]">Contacto</p>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4" />
              <span className="museo-label text-[11px]">Tulancingo de Bravo, Hidalgo, México</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4" />
              <a
                href="mailto:contacto@culturaenaltura.mx"
                className="museo-label text-[11px] hover:text-white transition-colors"
              >
                contacto@culturaenaltura.mx
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-6">
          <p className="museo-body text-white/30 text-xs text-center">
            Tulancingo de Bravo, Hidalgo, México · 2026
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
