# Modo - Elegant Exhibition Template

A premium, animation-rich single-page website template with a museum/gallery aesthetic. Features smooth scrolling, GSAP-powered animations, custom cursor, scroll-triggered reveals, parallax effects, and stacking card layouts.

## Features

- **Hero Section**: Split-text layout with center image, parallax scroll effects, navigation bar, and social links
- **About Section**: Text reveal animations, 3-column parallax image gallery, statistics counter
- **Exhibitions Section**: 2x2 grid with staggered scroll reveal, image hover effects, gradient overlays
- **Collections Section**: Full-screen stacking cards with pin-and-overlay scroll effect, alternating layouts
- **Testimonials Section**: Centered quote with author info, staggered reveal animation
- **Visit Section**: Info cards grid with icon support (MapPin, Clock, Calendar, Ticket), CTA button
- **Footer**: Infinite marquee text, social icon links, quick links, contact info, bottom navigation

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 3
- GSAP (ScrollTrigger)
- Lenis (smooth scroll)
- Lucide React (icons)
- Radix UI primitives
- shadcn/ui components

## Quick Start

```bash
npm install
npm run dev
```

## Configuration

All content is managed through `src/config.ts`. Edit the exported config objects to customize:

### siteConfig
- `language` - HTML lang attribute (e.g., "en", "zh", "ja")
- `title` - Page title
- `description` - Meta description

### heroConfig
- `brandLeft` / `brandRight` - Split headline text (left and right of center image)
- `tagline` - Subtitle text below left headline
- `badge` - Small label above center image
- `since` - Year or date text below right headline
- `email` - Contact email
- `heroImage` / `heroImageAlt` - Center image path and alt text
- `scrollText` / `copyrightText` - Bottom bar text
- `navLinks` - Array of `{ label, href }` for navigation
- `socialLinks` - Array of `{ label, href }` for social links

### aboutConfig
- `label` - Section label (e.g., "Established 1892")
- `headline` - Main heading (supports HTML line breaks)
- `description` - Body text
- `bottomText` - Closing paragraph text
- `galleryImages` - Array of `{ src, alt, label }` (distributed across 3 columns)
- `stats` - Array of `{ value, label }` for statistics

### exhibitionsConfig
- `label` - Section label
- `headline` - Main heading
- `ctaText` - Call-to-action button text
- `exhibitions` - Array of `{ id, title, image, date }`

### collectionsConfig
- `label` - Section label
- `headline` - Main heading
- `ctaText` - Per-card button text
- `collections` - Array of `{ id, title, year, description, image }`

### testimonialsConfig
- `quote` - Quote text (without quotation marks)
- `authorName` - Author name
- `authorTitle` - Author title/position
- `authorImage` - Author portrait image path

### visitConfig
- `label` - Section label
- `headline` - Main heading (supports HTML for line breaks)
- `description` - Body text
- `ctaText` - CTA button text
- `infoCards` - Array of `{ icon, title, content }` where icon is one of: MapPin, Clock, Calendar, Ticket. Content supports HTML.

### footerConfig
- `marqueeText` - Scrolling marquee text
- `brandName` - Brand name in footer
- `brandDescription` - Short brand description
- `socialLinks` - Array of `{ label, href }` where label maps to icon: Instagram, Twitter, Facebook, Linkedin, Youtube, Globe
- `quickLinks` - Array of `{ label, href }`
- `quickLinksTitle` - Column title for quick links
- `contactTitle` - Column title for contact info
- `contactItems` - Array of strings (supports HTML for line breaks)
- `bottomLinks` - Array of `{ label, href }` for footer bottom bar

## Required Images

Place images in `public/images/`:

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
