// Configuración - Cultura en Altura Tulancingo

export interface SiteConfig {
  language: string;
  title: string;
  description: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface HeroConfig {
  brandLeft: string;
  brandRight: string;
  tagline: string;
  badge: string;
  since: string;
  heroImage: string;
  heroImageAlt: string;
  scrollText: string;
  navLinks: NavLink[];
}

export interface GalleryImage {
  src: string;
  alt: string;
  label: string;
}

export interface AboutConfig {
  headline: string;
  description: string;
  historyTitle: string;
  historyText: string;
  projectTitle: string;
  projectText: string;
  galleryImages: GalleryImage[];
}

export interface Exhibition {
  id: number;
  title: string;
  image: string;
  subtitle: string;
  description: string;
}

export interface ExhibitionsConfig {
  headline: string;
  exhibitions: Exhibition[];
}

export interface FooterConfig {
  brandName: string;
  description: string;
  quickLinks: NavLink[];
}

export const siteConfig: SiteConfig = {
  language: "es",
  title: "¡Cultura en Altura! | Tulancingo, Hidalgo",
  description: "Descubre la riqueza cultural de Tulancingo, Hidalgo a través de recorridos virtuales 3D y modelado digital.",
};

export const heroConfig: HeroConfig = {
  brandLeft: "¡CULTURA",
  brandRight: "EN ALTURA!",
  tagline: "Tulancingo, Hidalgo",
  badge: "aprende y comparte la historia de Tulancingo",
  since: "2026",
  heroImage: "/images/cultua.png",
  heroImageAlt: "Logo ¡Cultura en Altura!",
  scrollText: "Descubre más",
  navLinks: [
    { label: "Iniciar Sesión", href: "/login" },
    { label: "Atractivos", href: "#exhibitions" },
    { label: "Contacto", href: "#footer" },
  ],
};

export const aboutConfig: AboutConfig = {
  headline: "¿Por qué Tulancingo?",
  description: "Tulancingo de Bravo es una ciudad con más de 2,500 años de historia, ubicada en el corazón del Valle de Tulancingo, Hidalgo. Su nombre proviene del náhuatl 'Tollan', que significa 'lugar de juncos'.",
  historyTitle: "Un legado histórico",
  historyText: "Desde la antigua Huapalcalco, capital tolteca de la madera, hasta la llegada de los españoles en el siglo XVI, Tulancingo ha sido testigo de la fusión entre culturas prehispánicas y coloniales. La ciudad conserva una de las catedrales más imponentes de México, construida en el siglo XVIII con cantera regional.",
  projectTitle: "El proyecto",
  projectText: "¡Cultura en Altura! nace ante la necesidad de preservar y difundir el patrimonio cultural de Tulancingo. A través del modelado 3D y recorridos virtuales interactivos, buscamos que las nuevas generaciones y visitantes conozcan la riqueza histórica de nuestra ciudad, fortaleciendo el sentido de pertenencia y la identidad cultural.",
  galleryImages: [
    { src: "/images/catedral.jpg", alt: "Catedral de Tulancingo", label: "Catedral" },
    { src: "/images/ferrocarril.jpg", alt: "Ferrocarril", label: "Ferrocarril" },
    { src: "/images/huapalcalco.jpg", alt: "Huapalcalco", label: "Huapalcalco" },
  ],
};

export const exhibitionsConfig: ExhibitionsConfig = {
  headline: "Atractivos Culturales",
  exhibitions: [
    {
      id: 1,
      title: "Catedral de Tulancingo",
      image: "/images/catedral.jpg",
      subtitle: "Patrimonio Colonial",
      description: "Construida en el siglo XVIII, es una de las catedrales más importantes de la región.",
    },
    {
      id: 2,
      title: "Ferrocarril",
      image: "/images/ferrocarril.jpg",
      subtitle: "Historia Industrial",
      description: "Testigo del desarrollo industrial y ferroviario del siglo XIX.",
    },
    {
      id: 3,
      title: "Zona Arqueológica Huapalcalco",
      image: "/images/reales/huapalcalco.jpg",
      subtitle: "Patrimonio Prehispánico",
      description: "Antigua capital tolteca conocida como la 'ciudad de la madera'.",
    },
  ],
};

export const footerConfig: FooterConfig = {
  brandName: "¡Cultura en Altura!",
  description: "Preservando la identidad cultural de Tulancingo mediante tecnología.",
  quickLinks: [
    { label: "Inicio", href: "#hero" },
    { label: "Atractivos", href: "#exhibitions" },
    { label: "Contacto", href: "#footer" },
  ],
};

