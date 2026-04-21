# 🏛️ Cultura en Altura - Aplicación Web

Plataforma interactiva para explorar el patrimonio cultural de Tulancingo, Hidalgo mediante recorridos virtuales 3D, realidad aumentada y comunidad.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Producción

```bash
npm run build
npm run preview
```

## 📱 Desarrollo Móvil

### Android

```bash
npm run mobile:build      # Compilar y sincronizar
npm run mobile:android    # Abrir Android Studio
```

### iOS

```bash
npm run mobile:build      # Compilar y sincronizar  
npm run mobile:ios        # Abrir Xcode
```

## 🧪 Testing

```bash
npm run test              # Ejecutar todos los tests
npm run test:watch        # Modo watch
npm run test:unit         # Tests unitarios
npm run test:integration  # Tests de integración
npm run test:coverage     # Con reporte de cobertura

# Tests E2E con Playwright
npm run test:e2e          # Headless
npm run test:e2e:ui       # Con interfaz gráfica
npm run test:e2e:headed   # Con navegador visible
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` con:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=tu-upload-preset
```

### Configuración del Sitio

Edita `src/config.ts` para personalizar:
- Textos de la página
- Imágenes y recursos
- Enlaces de navegación
- Configuración de exhibiciones

## 🏗️ Stack Tecnológico

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **GSAP** + Lenis - Animaciones
- **Three.js** - Gráficos 3D
- **Supabase** - Backend
- **Cloudinary** - Gestión de medios
- **Capacitor** - Mobile apps

## 📦 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecutar ESLint |
| `npm run test` | Tests unitarios |
| `npm run test:e2e` | Tests end-to-end |
| `npm run mobile:build` | Build para móvil |
| `npm run mobile:sync` | Sincronizar Capacitor |

## 📁 Estructura

```
src/
├── components/      # Componentes reutilizables
├── pages/          # Páginas principales
├── sections/       # Secciones de landing
├── lib/            # Servicios y utilidades
├── hooks/          # Custom hooks
├── data/           # Datos y configuración
└── __tests__/      # Tests
```

## 🎯 Características Principales

- ✅ Recorridos virtuales 3D interactivos
- ✅ Visor AR para dispositivos móviles
- ✅ Portal de comunidad con videos
- ✅ Sistema de autenticación Supabase
- ✅ Panel de administración
- ✅ Mapa mundial interactivo 3D
- ✅ Perfiles de usuario personalizables
- ✅ Animaciones GSAP y scroll suave

## 📖 Documentación Adicional

Ver el [README principal](../README.md) para:
- Guía completa de instalación
- Configuración de base de datos
- Documentación de API
- Deployment

---

**Hecho con ❤️ en Tulancingo, Hidalgo**

- `hero-statue.png` - Hero center image (transparent PNG recommended)
- `about-*.jpg/png` - About gallery images (6 recommended, 3/4 or 4/5 aspect ratio)
- `exhibit-*.jpg` - Exhibition card images (4/3 aspect ratio, 4 images)
- `collection-*.jpg` - Collection card images (16/10 aspect ratio, 4 images)
- `testimonial-portrait.jpg` - Testimonial author portrait (square, used in circle crop)

## Design

- **Color Palette**: Grey (#8c8c91), Black (#050505), Light (#f0f0f0), Charcoal (#1a1a1a)
- **Typography**: Inter font family (300-700 weights)
- **Layout**: Full-width sections with max-w-7xl content containers
- **Animations**: GSAP ScrollTrigger for scroll-based reveals, parallax, and stacking effects
- **Interactions**: Custom cursor with hover states, Lenis smooth scroll
- **Responsive**: Mobile-first with breakpoints at md (768px) and lg (1024px)

## Notes

- Each section returns `null` when its config data is empty, allowing selective section display
- Animations are preserved exactly as designed -- only content is configurable
- The custom cursor is automatically hidden on touch devices
- Reduced motion media query is supported for accessibility
- The Visit section `headline` and `infoCards[].content` support HTML strings for line breaks
