import { createElement, useEffect, useRef, useState, useCallback } from 'react';
import '@google/model-viewer';
import { ArrowLeft, View, RotateCw } from 'lucide-react';

interface ARViewerPageProps {
  onNavigate: (to: string, replace?: boolean) => void;
  modelSrc?: string;
  modelAlt?: string;
  backTo?: string;
}

type ModelViewerLike = HTMLElement & {
  src: string;
  canActivateAR?: boolean;
  activateAR?: () => void;
  dismissPoster?: () => void;
};

const STYLE_ID = 'ar-viewer-styles';
const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes arSpin { to{transform:rotate(360deg)} }
    @keyframes arFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes arPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  `;
  document.head.appendChild(s);
};

const ARViewerPage = ({ onNavigate, modelSrc = '/modelos/777-hq.glb', modelAlt = 'Modelo 3D', backTo = '/comunidad' }: ARViewerPageProps) => {
  const viewerRef = useRef<ModelViewerLike | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);

  const font = 'system-ui, -apple-system, sans-serif';

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    const p = { bg: document.body.style.backgroundColor, hbg: document.documentElement.style.backgroundColor, o: document.body.style.overflow };
    document.body.style.backgroundColor = '#1a1918';
    document.documentElement.style.backgroundColor = '#1a1918';
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.backgroundColor = p.bg; document.documentElement.style.backgroundColor = p.hbg; document.body.style.overflow = p.o; };
  }, []);

  // Auto-launch AR when ready (like cathedral)
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    let launched = false;
    const tryLaunch = () => {
      if (v.canActivateAR && !launched) {
        v.activateAR?.();
        setLaunched(true);
        launched = true;
      }
    };
    const interval = setInterval(tryLaunch, 400);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!v.canActivateAR) setError('Tu dispositivo no soporta AR, o el modelo es demasiado pesado. Intenta recargar.');
    }, 25000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [modelSrc]);

  /* Load model */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;

    const onLoad = () => {
      setProgress(100);
      setLoaded(true);
    };

    const onProgress = (e: Event) => {
      const p = (e as CustomEvent).detail?.totalProgress;
      if (typeof p === 'number') setProgress(Math.round(Math.min(p * 100, 100)));
    };

    const onError = () => {
      setError('No se pudo cargar el modelo 3D. Verifica tu conexión e intenta de nuevo.');
    };

    v.addEventListener('load', onLoad);
    v.addEventListener('progress', onProgress as EventListener);
    v.addEventListener('error', onError);
    v.src = modelSrc;
    v.dismissPoster?.();

    return () => {
      v.removeEventListener('load', onLoad);
      v.removeEventListener('progress', onProgress as EventListener);
      v.removeEventListener('error', onError);
    };
  }, [modelSrc]);

  const launchAR = useCallback(() => {
    const v = viewerRef.current;
    if (!v) return;
    if (v.canActivateAR) {
      v.activateAR?.();
      setLaunched(true);
    }
  }, []);

  // model-viewer hidden, only for AR
  const viewer = createElement('model-viewer', {
    ref: viewerRef,
    src: modelSrc,
    alt: modelAlt,
    loading: 'eager',
    reveal: 'auto',
    ar: true,
    'ar-modes': 'scene-viewer quick-look',
    'ar-scale': 'auto',
    'ar-placement': 'floor',
    'environment-image': 'neutral',
    'tone-mapping': 'aces',
    exposure: '1',
    'shadow-intensity': '0.8',
    'shadow-softness': '0.8',
    style: {
      position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none',
      backgroundColor: '#1a1918',
      '--poster-color': '#1a1918',
    },
  } as any);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#1a1918', overflow: 'hidden' }}>
      {viewer}

      {/* Overlay UI: Only loading/progress and error, no preview or AR button */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#1a1918',
      }}>
        {!error && (
          <>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.06)', borderTopColor: 'rgba(184,149,106,.65)',
              animation: 'arSpin .9s linear infinite', marginBottom: 22,
            }} />
            <div style={{ width: 200, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${progress}%`, background: 'linear-gradient(90deg,#b8956a,#d4a574)', transition: 'width .3s' }} />
            </div>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em', margin: 0 }}>
              Preparando modelo AR… {progress}%
            </p>
          </>
        )}
        {error && (
          <div style={{ textAlign: 'center', animation: 'arFadeIn .5s ease-out both' }}>
            <p style={{ fontFamily: font, fontSize: 13, color: '#c8915a', marginBottom: 16 }}>{error}</p>
            <button type="button" onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 24, cursor: 'pointer',
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                fontFamily: font, textTransform: 'uppercase', letterSpacing: '.06em',
              }}>
              <RotateCw size={14} />
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ARViewerPage;
