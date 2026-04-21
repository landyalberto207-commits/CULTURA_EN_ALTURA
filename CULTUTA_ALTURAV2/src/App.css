/* App-specific styles */

/* Smooth transitions for body background */
body {
  transition: background-color 0.6s ease-out;
}

/* Ensure proper stacking context */
#root {
  position: relative;
  z-index: 0;
}

/* Global link hover effects */
a {
  text-decoration: none;
  cursor: none;
}

/* Button base styles */
button {
  cursor: none;
}

/* Image loading optimization */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Prevent layout shift during image load */
img[src*="images"] {
  background: rgba(255, 255, 255, 0.05);
}

/* Typography refinements */
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}

/* Focus styles for accessibility */
a:focus-visible,
button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 4px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  .custom-cursor {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  body {
    --border-opacity: 0.5;
  }
}
