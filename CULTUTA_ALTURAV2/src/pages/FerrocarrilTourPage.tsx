import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize, BookOpen, X, ArrowLeft, Lock, ChevronLeft, ChevronRight, Volume2, VolumeX, Star, Smartphone } from 'lucide-react';
import { fetchTourLocation, type TourLocation } from '../data/tours';
import { supabase } from '../lib/supabase';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, BakeShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const MODEL_URL = '/modelos/ferro.glb';

interface FerrocarrilTourPageProps {
  isLoggedIn?: boolean;
  onNavigate?: (to: string, replace?: boolean) => void;
}

/* ── CINEMATIC SCENES ── */
interface Scene {
  id: number;
  title: string;
  description: string;
  spherical: [number, number, number];
  lookOffset: [number, number, number];
}

const SCENE_CAMERAS: { spherical: [number, number, number]; lookOffset: [number, number, number] }[] = [
  { spherical: [15, 12, 1.3], lookOffset: [0, 0.12, 0] },
  { spherical: [-55, 14, 1.2], lookOffset: [0, 0.15, 0] },
  { spherical: [160, 16, 1.15], lookOffset: [0, 0.1, 0] },
  { spherical: [45, 30, 1.5], lookOffset: [0, 0.08, 0] },
];

function buildScenes(tour: TourLocation): Scene[] {
  return tour.scenes.map((s: TourLocation['scenes'][number], i: number) => ({
    id: s.id,
    title: s.title,
    description: s.subtitle,
    spherical: SCENE_CAMERAS[i]?.spherical ?? [0, 15, 1.6],
    lookOffset: SCENE_CAMERAS[i]?.lookOffset ?? [0, 0, 0],
  }));
}

/* ── Helper: compute world position from spherical scene definition ── */
function sceneToWorld(
  scene: Scene,
  center: THREE.Vector3,
  radius: number,
  size: THREE.Vector3
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const azimuth = THREE.MathUtils.degToRad(scene.spherical[0]);
  const elevation = THREE.MathUtils.degToRad(scene.spherical[1]);
  const dist = radius * scene.spherical[2];
  const position = new THREE.Vector3(
    center.x + dist * Math.cos(elevation) * Math.sin(azimuth),
    center.y + dist * Math.sin(elevation),
    center.z + dist * Math.cos(elevation) * Math.cos(azimuth)
  );
  const target = new THREE.Vector3(
    center.x + scene.lookOffset[0] * size.x,
    center.y + scene.lookOffset[1] * size.y,
    center.z + scene.lookOffset[2] * size.z
  );
  return { position, target };
}

/* ── 3D MODEL COMPONENT ── */
const FerrocarrilModel = ({ onBoundsReady }: { onBoundsReady: (center: THREE.Vector3, radius: number, size: THREE.Vector3) => void }) => {
  const { scene } = useGLTF(MODEL_URL);
  const { gl } = useThree();
  const boundsComputed = useRef(false);
  const clippingPlanesRef = useRef<THREE.Plane[]>([]);

  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    gl.localClippingEnabled = true;

    if (!boundsComputed.current) {
      boundsComputed.current = true;

      // 1. Get original bounding box
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const radius = size.length() / 2;

      // 2. Reposition and rotate for best presentation angle
      scene.position.set(-center.x, -center.y + size.y / 2, -center.z);
      scene.rotation.y = THREE.MathUtils.degToRad(12);

      // 3. Force matrix update so world positions are correct
      scene.updateMatrixWorld(true);

      // 4. Compute NEW bounding box in world space
      const worldBox = new THREE.Box3().setFromObject(scene);
      const worldSize = new THREE.Vector3();
      worldBox.getSize(worldSize);

      // 5. Clipping planes — trim edges for clean silhouette
      const xMin = worldBox.min.x + worldSize.x * 0.18;
      const xMax = worldBox.max.x - worldSize.x * 0.18;
      clippingPlanesRef.current = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), -xMin),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), xMax),
      ];

      const newCenter = new THREE.Vector3(0, size.y / 2, 0);
      onBoundsReady(newCenter, radius, size);
    }

    // Apply materials + clipping planes
    const planes = clippingPlanesRef.current;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            mat.envMapIntensity = 2.0;
            mat.roughness = Math.max(mat.roughness * 0.85, 0);
            mat.metalness = Math.min(mat.metalness + 0.02, 1);
            if (planes.length > 0) {
              mat.clippingPlanes = planes;
              mat.clipShadows = true;
            }
            if (mat.map) {
              mat.map.anisotropy = Math.min(maxAniso, 8);
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.needsUpdate = true;
            }
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [scene, onBoundsReady, gl]);

  return <primitive object={scene} />;
};

/* ── FOG SPHERE ── */
const FogSphere = ({ radius }: { radius: number }) => {
  const fogRadius = radius * 3.5;
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#c8b8a0') } },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float yFade = smoothstep(0.45, -0.3, vWorldPos.y / ${fogRadius.toFixed(1)});
          float alpha = rim * yFade * 0.7;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    return mat;
  }, [fogRadius]);
  return (
    <mesh material={material}>
      <sphereGeometry args={[fogRadius, 32, 32]} />
    </mesh>
  );
};

/* ── LANDSCAPE (Ground) ── */
const Landscape = ({ radius }: { radius: number }) => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[radius * 30, radius * 30]} />
        <meshStandardMaterial color="#8B7355" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
};

/* ── CAMERA ANIMATOR ── */
const CameraAnimator = ({
  scene, isAutoPlaying, modelCenter, modelRadius, modelSize,
}: {
  scene: Scene; isAutoPlaying: boolean; modelCenter: THREE.Vector3; modelRadius: number; modelSize: THREE.Vector3;
}) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useEffect(() => {
    const { position, target } = sceneToWorld(scene, modelCenter, modelRadius, modelSize);
    targetPos.current.copy(position);
    targetLook.current.copy(target);
    if (!initialized.current) {
      camera.position.copy(position);
      currentLook.current.copy(target);
      camera.lookAt(target);
      initialized.current = true;
    }
  }, [scene, modelCenter, modelRadius, modelSize, camera]);

  useFrame(() => {
    if (!isAutoPlaying) return;
    camera.position.lerp(targetPos.current, 0.02);
    currentLook.current.lerp(targetLook.current, 0.02);
    camera.lookAt(currentLook.current);
  });

  return null;
};

const LOAD_STEPS = [
  'Iniciando experiencia...',
  'Cargando modelo 3D...',
  'Optimizando escenas...',
  'Preparando recorrido...',
  '¡Listo!',
];

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += 1;
      setProgress(current);
      const newStep = Math.min(Math.floor(current / 20), LOAD_STEPS.length - 1);
      setStepIndex(newStep);
      if (current >= 100) {
        clearInterval(intervalRef.current!);
        setTimeout(onComplete, 900);
      }
    }, 32);
    return () => clearInterval(intervalRef.current!);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#020202] overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          className="w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(180,120,60,0.06) 0%, transparent 60%)', filter: 'blur(40px)' }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <motion.svg viewBox="0 0 400 400" className="w-[120vw] h-[120vw] max-w-[800px] max-h-[800px]"
          animate={{ rotate: 90 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
          <circle cx="200" cy="200" r="180" fill="none" stroke="#B4783C" strokeWidth="0.5"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x = 200 + Math.cos(angle) * 60;
            const y = 200 + Math.sin(angle) * 60;
            return (
              <circle key={`gear-${i}`} cx={x} cy={y} r="100" fill="none" stroke="#B4783C" strokeWidth="0.3"
                pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress}
                style={{ transition: 'stroke-dashoffset 0.15s ease-out' }} />
            );
          })}
          {[...Array(16)].map((_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            const x2 = 200 + Math.cos(angle) * 180;
            const y2 = 200 + Math.sin(angle) * 180;
            return (
              <line key={`rail-${i}`} x1="200" y1="200" x2={x2} y2={y2}
                stroke="#B4783C" strokeWidth="0.15" pathLength="100"
                strokeDasharray="100" strokeDashoffset={100 - progress}
                style={{ transition: 'stroke-dashoffset 0.2s ease-out' }} />
            );
          })}
          <circle cx="200" cy="200" r="60" fill="none" stroke="#B4783C" strokeWidth="0.6"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
        </motion.svg>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-8 backdrop-blur-[2px] rounded-full">
        <div className="relative font-extralight text-[7rem] md:text-[13rem] leading-[0.85] tracking-tight mb-6 flex items-center justify-center"
          style={{ fontVariantNumeric: 'tabular-nums', color: '#F8F5F0', textShadow: '0 0 40px rgba(180,120,60,0.3)' }}>
          {String(progress).padStart(3, '0')}
          <span className="text-[3rem] md:text-[4.5rem] opacity-60 relative -top-6 md:-top-12 ml-2" style={{ color: '#B4783C' }}>%</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }}
          className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 opacity-60">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#B4783C]" />
            <div className="w-1.5 h-1.5 rotate-45 border border-[#B4783C]" />
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#B4783C]" />
          </div>
          <div className="text-center mt-2">
            <h1 className="text-[#F8F5F0] text-xs md:text-sm uppercase tracking-[0.6em] font-light mb-3">Ferrocarril</h1>
            <AnimatePresence mode="wait">
              <motion.h2 key={stepIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                className="text-[#B4783C] text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold opacity-80">
                {LOAD_STEPS[stepIndex]}
              </motion.h2>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

/* ── MAIN COMPONENT ── */
const FerrocarrilTourPage = ({ isLoggedIn = false, onNavigate }: FerrocarrilTourPageProps) => {
  const [tourData, setTourData] = useState<TourLocation | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState('Acerca de');
  const [showLoading, setShowLoading] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [modelCenter, setModelCenter] = useState<THREE.Vector3>(new THREE.Vector3());
  const [modelRadius, setModelRadius] = useState(10);
  const [modelSize, setModelSize] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
  const [modelReady, setModelReady] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTourLocation('ferrocarril').then((data: TourLocation | null) => {
      if (data) {
        setTourData(data);
        setScenes(buildScenes(data));
      }
    });
  }, []);

  const handleBoundsReady = useCallback((center: THREE.Vector3, radius: number, size: THREE.Vector3) => {
    setModelCenter(center);
    setModelRadius(radius);
    setModelSize(size);
    setModelReady(true);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullScreen(true); }
    else { document.exitFullscreen(); setIsFullScreen(false); }
  };

  const handleStartTour = () => {
    if (isLoggedIn) setShowLoading(true);
    else setShowLoginPrompt(true);
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
    setTourStarted(true);
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 4000);
  }, []);

  const playTransitionSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* AudioContext not available */ }
  }, [isMuted]);

  const handleRatingSubmit = useCallback(async () => {
    if (userRating > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('tour_ratings').upsert(
            { user_id: user.id, tour_name: 'ferrocarril', rating: userRating },
            { onConflict: 'user_id,tour_name' }
          );
        }
      } catch { /* silently fail */ }
    }
    setShowRating(false);
    setIsAutoPlaying(false);
  }, [userRating]);

  const playSceneAudio = useCallback((sceneIdx: number) => {
    const tourScene = tourData?.scenes[sceneIdx];
    if (!tourScene) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    const audio = new Audio(tourScene.audioFile);
    audio.muted = isMuted;
    audio.volume = 1;
    audioRef.current = audio;
    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(() => {});
    }, { once: true });
    audio.addEventListener('ended', () => {
      if (sceneIdx >= scenes.length - 1) {
        setTimeout(() => { setTourCompleted(true); setShowRating(true); }, 1000);
      } else if (isAutoPlaying) {
        playTransitionSound();
        setTimeout(() => {
          setCurrentScene(sceneIdx + 1);
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 3000);
        }, 1500);
      }
    }, { once: true });
    audio.load();
  }, [isMuted, isAutoPlaying, tourData, scenes.length, playTransitionSound]);

  useEffect(() => {
    if (tourStarted) playSceneAudio(currentScene);
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, [currentScene, tourStarted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (bgMusicRef.current) bgMusicRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!tourStarted || tourCompleted) return;
    const bgMusic = new Audio('/audio/ferrocarril/ambient.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.12;
    bgMusicRef.current = bgMusic;
    bgMusic.play().catch(() => {});
    return () => { bgMusic.pause(); bgMusic.src = ''; bgMusicRef.current = null; };
  }, [tourStarted, tourCompleted]);

  const goToScene = (idx: number) => {
    setCurrentScene(idx);
    setIsAutoPlaying(true);
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 3000);
  };

  const nextScene = () => goToScene((currentScene + 1) % scenes.length);
  const prevScene = () => goToScene((currentScene - 1 + scenes.length) % scenes.length);

  useEffect(() => {
    if (!tourStarted || !isAutoPlaying || scenes.length === 0) return;
    autoPlayTimer.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) return;
      setCurrentScene((prev) => {
        if (prev >= scenes.length - 1) return prev;
        const next = prev + 1;
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 3000);
        return next;
      });
    }, 15000);
    return () => { if (autoPlayTimer.current) clearInterval(autoPlayTimer.current); };
  }, [tourStarted, isAutoPlaying, scenes.length]);

  const scene = scenes[currentScene];

  /* ── TOUR VIEW (3D) ── */
  if (tourStarted && scene) {
    return (
      <section className="relative w-full h-[100dvh] overflow-hidden bg-black">
        <Canvas
          shadows
          camera={{ fov: 35, near: 0.1, far: 5000 }}
          className="absolute inset-0"
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          flat={false}
          gl={{
            antialias: !isMobile,
            toneMapping: THREE.NoToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            gl.localClippingEnabled = true;
          }}
        >
          <Suspense fallback={null}>
            <FerrocarrilModel onBoundsReady={handleBoundsReady} />
            {modelReady && <FogSphere radius={modelRadius} />}
            <Environment
              files="/env/sky.hdr"
              background
              backgroundBlurriness={0.03}
              backgroundIntensity={0.75}
              environmentIntensity={0.5}
            />
            <Environment
              files="/env/golden.hdr"
              environmentIntensity={1.8}
            />
            <fog attach="fog" args={['#c8b8a0', modelRadius * 2.5, modelRadius * 5]} />
            <BakeShadows />
          </Suspense>

          {/* Cinematic golden-hour industrial lighting */}
          <directionalLight position={[80, 60, 50]} intensity={3.5} color="#FFE4B5" castShadow
            shadow-mapSize-width={2048} shadow-mapSize-height={2048}
            shadow-camera-near={0.5} shadow-camera-far={500}
            shadow-camera-left={-100} shadow-camera-right={100}
            shadow-camera-top={100} shadow-camera-bottom={-100}
            shadow-bias={-0.0001} shadow-normalBias={0.04} />
          <directionalLight position={[-60, 80, -40]} intensity={1.0} color="#B0C4DE" />
          <directionalLight position={[-30, 30, 80]} intensity={1.2} color="#FFA500" />
          <hemisphereLight args={['#87CEEB', '#D2691E', 0.5]} />
          <ambientLight intensity={0.2} color="#FFF8F0" />

          <EffectComposer multisampling={isMobile ? 0 : 4}>
            <ToneMapping mode={ToneMappingMode.AGX} />
            <BrightnessContrast brightness={0.03} contrast={0.12} />
            <HueSaturation saturation={0.1} />
            <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.2} mipmapBlur levels={4} />
            <Vignette offset={0.25} darkness={0.5} />
          </EffectComposer>

          {modelReady && (
            <CameraAnimator scene={scene} isAutoPlaying={isAutoPlaying} modelCenter={modelCenter} modelRadius={modelRadius} modelSize={modelSize} />
          )}
          {!isAutoPlaying && modelReady && (
            <OrbitControls target={modelCenter} enablePan enableZoom enableRotate enableDamping
              dampingFactor={0.03} rotateSpeed={0.5} maxPolarAngle={Math.PI / 1.6}
              minDistance={modelRadius * 0.2} maxDistance={modelRadius * 5} />
          )}
        </Canvas>

        {/* Top Bar */}
        <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => { setTourStarted(false); setCurrentScene(0); setTourCompleted(false); setShowRating(false); setUserRating(0); setIsAutoPlaying(true); if (audioRef.current) audioRef.current.pause(); if (bgMusicRef.current) bgMusicRef.current.pause(); }}
              className="flex items-center gap-2 p-2.5 rounded-full bg-black/30 backdrop-blur-md hover:bg-white/20 transition-all text-white border border-white/10">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-[22px] tracking-wide drop-shadow-md text-white hidden sm:block">¡Cultura en Altura!</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all border ${isMuted ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-black/30 text-white border-white/10 hover:bg-white/20'}`}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={toggleFullScreen} className="p-2.5 rounded-full bg-black/30 backdrop-blur-md hover:bg-white/20 transition-all text-white border border-white/10 hidden sm:block">
              {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Scene Info Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none"
            >
              <p className="text-amber-400 text-xs md:text-sm uppercase tracking-[0.4em] font-extrabold mb-3" style={{ textShadow: '0 0 20px rgba(0,0,0,1), 0 0 40px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,1)' }}>Escena {currentScene + 1} de {scenes.length}</p>
              <h2 className="text-white text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-4" style={{ textShadow: '0 0 30px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,1)' }}>{scene.title}</h2>
              <p className="text-white text-sm md:text-base max-w-lg mx-auto leading-relaxed" style={{ textShadow: '0 0 20px rgba(0,0,0,1), 0 0 40px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,1)' }}>{scene.description}</p>
              {!isMuted && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                  className="mt-5 flex items-center justify-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 text-[10px] uppercase tracking-[0.3em] font-bold" style={{ textShadow: '0 0 15px rgba(0,0,0,1)' }}>Narración en curso</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Scene Navigation */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <button onClick={prevScene} className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-white/20 transition-all text-white border border-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {scenes.map((s, idx) => (
              <button key={s.id} onClick={() => goToScene(idx)}
                className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold backdrop-blur-md transition-all border ${idx === currentScene
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-black/30 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'}`}>
                {s.title}
              </button>
            ))}
          </div>
          <button onClick={nextScene} className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-white/20 transition-all text-white border border-white/10">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Overlay */}
        <AnimatePresence>
          {showRating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[50] bg-black/70 backdrop-blur-xl flex items-center justify-center">
              <motion.div initial={{ y: 40, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 max-w-md w-full mx-4 text-center shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center">
                  <Star className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">¡Recorrido Completado!</h3>
                <p className="text-white/50 text-sm mb-8">¿Cómo fue tu experiencia?</p>
                <div className="flex items-center justify-center gap-3 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setUserRating(star)}
                      className="transition-all duration-200 hover:scale-125 active:scale-95">
                      <Star className={`w-9 h-9 transition-colors ${star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-white/20 hover:text-white/40'}`} />
                    </button>
                  ))}
                </div>
                <button onClick={handleRatingSubmit}
                  className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-black font-extrabold text-[11px] uppercase tracking-[0.2em] py-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-[0_8px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.5)]">
                  Explorar Libremente
                </button>
                <p className="text-white/30 text-[10px] mt-4 tracking-wide">Podrás rotar, hacer zoom y explorar el modelo 3D</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ResourcesModal show={showResources} onClose={() => setShowResources(false)} activeTab={activeTab} setActiveTab={setActiveTab} />
      </section>
    );
  }

  /* ── LANDING VIEW ── */
  return (
    <>
      <AnimatePresence>{showLoading && <LoadingScreen onComplete={handleLoadingComplete} />}</AnimatePresence>
      <section className="relative w-full h-[100dvh] overflow-hidden bg-black font-sans">
        <video autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-1000"
          src={isMobile ? '/videos/ferrocarril-mobile.mp4' : '/videos/FERRRO.MP4'} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" />

        <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate?.('/', true)}
              className="flex items-center gap-2 p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-white/20 transition-all text-white shadow-sm border border-white/10">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-[22px] tracking-wide drop-shadow-md text-white hidden sm:block">¡Cultura en Altura!</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFullScreen} className="p-2.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-white/20 transition-all text-white shadow-sm border border-white/10 hidden sm:block">
              {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="absolute inset-0 flex items-center justify-center z-10">
          <motion.div initial={{ y: 40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center px-6 max-w-2xl">
            <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extralight text-white mb-4 tracking-tight leading-[0.9]">
              <span className="font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 bg-clip-text text-transparent">
                Ferrocarril
              </span>
            </motion.h1>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}
              className="text-white/50 text-sm sm:text-base font-light max-w-lg mb-4 leading-relaxed">
              Testigo del desarrollo industrial y ferroviario del siglo XIX. Descubre la historia que recorrió los rieles de Tulancingo.
            </motion.p>
            <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1, duration: 0.6 }}
              className="flex gap-3 mb-10">
              <span className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 bg-white/5 backdrop-blur-md rounded-full border border-white/10">Duración: 5 mins</span>
              <span className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 bg-white/5 backdrop-blur-md rounded-full border border-white/10">4 Escenas</span>
              <span className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 bg-white/5 backdrop-blur-md rounded-full border border-white/10">Tulancingo, Hgo.</span>
            </motion.div>
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.3, duration: 0.7 }}
              onClick={handleStartTour}
              className="relative group px-12 py-4 rounded-full font-extrabold text-[11px] uppercase tracking-[0.25em] text-white transition-all duration-500 active:scale-95 hover:-translate-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.1)',
              }}>
              <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 0 40px rgba(255,255,255,0.15)' }} />
              <span className="relative z-10 flex items-center gap-2.5">INICIAR RECORRIDO</span>
            </motion.button>
            {isMobile && (
              <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5, duration: 0.7 }}
                onClick={() => onNavigate?.('/ar/ferrocarril')}
                className="mt-4 flex items-center gap-2 px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] text-amber-400/80 hover:text-amber-300 transition-all duration-300 active:scale-95 border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 backdrop-blur-md">
                <Smartphone className="w-4 h-4" />
                Ver en Realidad Aumentada
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Login Prompt */}
        <AnimatePresence>
          {showLoginPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setShowLoginPrompt(false)}>
              <motion.div initial={{ y: 40, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 20, scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-[0_40px_80px_rgba(0,0,0,0.6)] text-center"
                onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Acceso Exclusivo</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                  Inicia sesión para acceder al recorrido 3D completo del Ferrocarril.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => onNavigate?.('/login?redirect=/recorrido/ferrocarril')}
                    className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-black font-extrabold text-[11px] uppercase tracking-[0.2em] py-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-[0_8px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_25px_rgba(249,115,22,0.5)]">
                    Iniciar Sesión
                  </button>
                  <button onClick={() => setShowLoginPrompt(false)}
                    className="w-full py-3 rounded-full text-white/40 text-[11px] font-bold tracking-[0.15em] uppercase hover:text-white/60 hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10">
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ResourcesModal show={showResources} onClose={() => setShowResources(false)} activeTab={activeTab} setActiveTab={setActiveTab} />
      </section>
    </>
  );
};

/* ── RESOURCES MODAL ── */
const ResourcesModal = ({ show, onClose, activeTab, setActiveTab }: { show: boolean; onClose: () => void; activeTab: string; setActiveTab: (t: string) => void }) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-10">
        <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-5xl h-[90vh] bg-[#fdfdfd] rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl">
          <div className="h-[25vh] md:h-[30vh] relative bg-[#111] shrink-0">
            <div className="w-full h-full bg-[url('/images/ferrocarril.jpg')] bg-cover bg-center opacity-40 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <button onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 group">
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center">
              <h1 className="text-4xl md:text-5xl font-normal text-white mb-2 tracking-tight">Recursos</h1>
              <h2 className="text-white/70 font-semibold tracking-wider uppercase text-xs">Ferrocarril</h2>
            </div>
          </div>
          <div className="bg-[#18181B] shrink-0 border-b border-black">
            <div className="flex overflow-x-auto hide-scrollbar max-w-4xl mx-auto">
              {['Acerca de', 'Galería', 'Enlaces', 'Aliados', 'Créditos'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-max py-5 px-6 text-xs uppercase tracking-widest font-bold transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
                  {tab}
                  {activeTab === tab && <motion.div layoutId="activeTabFerrocarril" className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-8 md:p-14 text-gray-800">
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'Acerca de' && (
                  <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-3xl md:text-4xl font-light text-center mb-12 text-black">Acerca del Museo</h3>
                    <div className="grid md:grid-cols-2 gap-10 text-base md:text-lg leading-loose text-gray-600">
                      <p>El ferrocarril de Tulancingo es un testimonio vivo del desarrollo industrial que transformó la región en el siglo XIX. La estación conserva su arquitectura original y alberga locomotoras, vagones y objetos que narran la historia del transporte ferroviario en Hidalgo.</p>
                      <p>Este espacio cultural preserva la memoria de una época en que los rieles conectaron Tulancingo con el resto del país, impulsando el comercio y la comunicación. Hoy, mediante tecnología 3D, revivimos esa historia para las nuevas generaciones.</p>
                    </div>
                  </motion.div>
                )}
                {activeTab !== 'Acerca de' && (
                  <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center opacity-40 py-24">
                    <BookOpen className="w-16 h-16 text-gray-400 mb-6" strokeWidth={1} />
                    <h3 className="text-2xl font-light text-gray-500">Desarrollando la sección de {activeTab}...</h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default FerrocarrilTourPage;
