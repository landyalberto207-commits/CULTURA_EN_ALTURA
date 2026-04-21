# 🏛️ ¡Cultura en Altura!

<p align="center">
  <img src="CULTUTA_ALTURAV2/public/images/cultua.png" alt="Cultura en Altura Logo" width="200"/>
</p>

<p align="center">
  <strong>Plataforma web interactiva para explorar el patrimonio cultural de Tulancingo, Hidalgo</strong>
</p>

---

## 📖 Descripción

**¡Cultura en Altura!** es una plataforma web innovadora que preserva y difunde el patrimonio cultural de Tulancingo de Bravo, Hidalgo, México. A través de recorridos virtuales 3D, experiencias de realidad aumentada (AR), y una comunidad interactiva, los usuarios pueden explorar los sitios históricos más emblemáticos de la ciudad.

### ✨ Características Principales

- 🏰 **Recorridos Virtuales 3D**: Explora la Catedral de Tulancingo, el Ferrocarril histórico y la Zona Arqueológica de Huapalcalco con modelos 3D interactivos
- 📱 **Experiencia AR**: Visualiza monumentos en realidad aumentada desde tu dispositivo móvil
- 👥 **Portal de Comunidad**: Comparte videos, historias y experiencias culturales
- 🎨 **Galería Mundial**: Explora experiencias culturales de diferentes países en un mapa interactivo 3D
- 🔐 **Sistema de Autenticación**: Registro e inicio de sesión con Supabase
- 👑 **Panel de Administración**: Moderación de contenido de la comunidad
- 📊 **Perfiles de Usuario**: Página de perfil personalizada para cada usuario

---

## 🚀 Tecnologías

### Frontend
- **React 19** + **TypeScript** - Framework y tipado
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos y diseño responsive
- **GSAP** + **Lenis** - Animaciones y smooth scroll
- **Three.js** + **@react-three/fiber** - Renderizado 3D
- **Leaflet** - Mapas interactivos
- **shadcn/ui** - Componentes UI

### Backend & Servicios
- **Supabase** - Base de datos, autenticación y almacenamiento
- **Cloudinary** - Gestión de videos e imágenes
- **Python/FastAPI** - API backend (opcional)

### Herramientas de Desarrollo
- **ESLint** - Linting
- **Vitest** - Testing unitario
- **Playwright** - Testing E2E
- **Capacitor** - Integración mobile (Android/iOS)

---

## 📋 Requisitos Previos

- **Node.js** 18+ y npm
- **Git**
- Cuenta en **Supabase** (para base de datos)
- Cuenta en **Cloudinary** (para subida de medios)

---

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/landyalberto207-commits/CULTURA_EN_ALTURA.git
cd CULTURA_EN_ALTURA/CULTUTA_ALTURAV2
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto `CULTUTA_ALTURAV2/`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=tu-upload-preset
```

> **⚠️ Importante**: Nunca subas el archivo `.env.local` a Git. Este archivo ya está en `.gitignore`.

### 4. Configurar Base de Datos Supabase

Ejecuta las siguientes tablas en tu proyecto Supabase:

#### Tabla: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: `community_videos`
```sql
CREATE TABLE community_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  location TEXT,
  likes INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: `tour_locations`
```sql
CREATE TABLE tour_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT
);
```

#### Tabla: `tour_scenes`
```sql
CREATE TABLE tour_scenes (
  id SERIAL PRIMARY KEY,
  location_id TEXT REFERENCES tour_locations(id),
  scene_order INTEGER,
  title TEXT,
  subtitle TEXT,
  narration TEXT,
  audio_file TEXT
);
```

#### Tabla: `tour_hotspots`
```sql
CREATE TABLE tour_hotspots (
  id SERIAL PRIMARY KEY,
  scene_id INTEGER REFERENCES tour_scenes(id),
  label TEXT,
  description TEXT,
  hotspot_order INTEGER
);
```

### 5. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 📱 Compilación para Móviles

### Android

```bash
# Compilar y sincronizar
npm run mobile:build

# Abrir en Android Studio
npm run mobile:android
```

### iOS

```bash
# Compilar y sincronizar
npm run mobile:build

# Abrir en Xcode
npm run mobile:ios
```

---

## 🧪 Testing

### Tests Unitarios
```bash
npm run test              # Ejecutar todos los tests
npm run test:watch        # Modo watch
npm run test:unit         # Solo tests unitarios
npm run test:coverage     # Con cobertura
```

### Tests de Integración
```bash
npm run test:integration
```

### Tests E2E (Playwright)
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # Con UI
npm run test:e2e:headed   # Con navegador visible
```

---

## 🏗️ Estructura del Proyecto

```
CULTUTA_ALTURAV2/
├── android/              # Proyecto Capacitor Android
├── public/               # Archivos estáticos
│   ├── audio/           # Archivos de audio para tours
│   ├── env/             # Archivos HDR para entornos 3D
│   ├── images/          # Imágenes estáticas
│   ├── modelos/         # Modelos 3D (.glb, .usdz)
│   └── videos/          # Videos
├── src/
│   ├── __tests__/       # Tests unitarios e integración
│   ├── components/      # Componentes React reutilizables
│   │   └── ui/         # Componentes UI de shadcn
│   ├── data/           # Datos y configuraciones
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilidades y servicios
│   │   ├── api.ts     # Cliente API
│   │   ├── supabase.ts # Cliente Supabase
│   │   ├── cloudinary.ts # Utilidades Cloudinary
│   │   └── utils.ts   # Funciones auxiliares
│   ├── pages/         # Páginas principales
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── CommunityPortalPage.tsx
│   │   ├── AdminPortalPage.tsx
│   │   ├── CatedralTourPage.tsx
│   │   ├── FerrocarrilTourPage.tsx
│   │   ├── PiramidesTourPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ARViewerPage.tsx
│   ├── sections/      # Secciones de la landing
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Exhibitions.tsx
│   │   ├── WorldView.tsx
│   │   └── Footer.tsx
│   ├── App.tsx        # Componente principal
│   ├── config.ts      # Configuración del sitio
│   └── main.tsx       # Punto de entrada
├── .env.local         # Variables de entorno (NO SUBIR A GIT)
├── .env.example       # Plantilla de variables
├── package.json       # Dependencias
└── vite.config.ts     # Configuración Vite
```

---

## 🎯 Rutas de la Aplicación

| Ruta | Descripción | Requiere Auth |
|------|-------------|---------------|
| `/` | Página de inicio | No |
| `/login` | Login/Registro | No |
| `/comunidad` | Portal de comunidad | Sí |
| `/admin` | Panel de administración | Sí (Admin) |
| `/perfil` | Perfil del usuario actual | Sí |
| `/perfil/:userId` | Perfil de otro usuario | Sí |
| `/recorrido/catedral` | Tour 3D Catedral | No |
| `/recorrido/ferrocarril` | Tour 3D Ferrocarril | No |
| `/recorrido/piramides` | Tour 3D Pirámides | No |
| `/ar` | Visor AR genérico | No (móvil) |
| `/ar/catedral` | AR Catedral | No (móvil) |
| `/ar/ferrocarril` | AR Ferrocarril | No (móvil) |
| `/ar/piramides` | AR Pirámides | No (móvil) |
| `/mundo` | Mapa mundial interactivo | No |

---

## 🔑 Características de Seguridad

- ✅ Autenticación con Supabase Auth
- ✅ Row Level Security (RLS) en Supabase
- ✅ Variables de entorno protegidas
- ✅ Validación de uploads en Cloudinary
- ✅ Sistema de roles (usuario/admin)
- ✅ Moderación de contenido

---

## 🤝 Contribución

Este es un proyecto educativo para preservar el patrimonio cultural de Tulancingo. Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👥 Autores

- **Proyecto Cultura en Altura** - Preservando la identidad cultural de Tulancingo mediante tecnología

---

## 🙏 Agradecimientos

- Instituto Tecnológico de Tulancingo
- Gobierno Municipal de Tulancingo
- Comunidad de desarrolladores

---

## 📞 Contacto

Para más información sobre el proyecto, visita nuestro sitio web o contacta al equipo de desarrollo.

---

<p align="center">
  Hecho con ❤️ en Tulancingo, Hidalgo, México
</p>