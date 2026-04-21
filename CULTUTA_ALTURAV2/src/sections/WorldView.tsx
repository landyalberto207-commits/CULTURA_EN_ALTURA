import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { feature } from 'topojson-client';
import worldAtlasUrl from 'world-atlas/countries-110m.json?url';

type Experience = {
  id: string;
  title: string;
  subtitle: string;
  country: string;
  image: string;
  lat: number;
  lng: number;
};

type LocalExperience = {
  id: string;
  title: string;
  image: string;
  lat: number;
  lng: number;
};

type LonLat = [number, number];

type SimpleGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

type SimpleFeatureCollection = {
  features: Array<{
    geometry: SimpleGeometry;
  }>;
};

const experiences: Experience[] = [
  {
    id: 'tulancingo',
    title: 'Explora Tulancingo desde el mundo',
    subtitle: 'Tulancingo, Hidalgo, Mexico',
    country: 'Mexico',
    image: '/images/reales/catedral.jpg',
    lat: 20.083,
    lng: -98.367,
  },
  {
    id: 'kyiv',
    title: 'Historia viva del centro de Kyiv',
    subtitle: 'Kyiv, Ucrania',
    country: 'Ukraine',
    image: '/images/reales/ferrocarril.jpg',
    lat: 50.45,
    lng: 30.523,
  },
  {
    id: 'lima',
    title: 'Recorrido barroco por el centro historico',
    subtitle: 'Lima, Peru',
    country: 'Peru',
    image: '/images/reales/huapalcalco.jpg',
    lat: -12.046,
    lng: -77.042,
  },
  {
    id: 'tokyo',
    title: 'Templos y modernidad',
    subtitle: 'Tokio, Japon',
    country: 'Japan',
    image: '/images/reales/catedral.jpg',
    lat: 35.676,
    lng: 139.65,
  },
  {
    id: 'nairobi',
    title: 'Rutas culturales urbanas',
    subtitle: 'Nairobi, Kenia',
    country: 'Kenya',
    image: '/images/reales/ferrocarril.jpg',
    lat: -1.286,
    lng: 36.817,
  },
  {
    id: 'sydney',
    title: 'Paisajes costeros patrimoniales',
    subtitle: 'Sydney, Australia',
    country: 'Australia',
    image: '/images/reales/huapalcalco.jpg',
    lat: -33.868,
    lng: 151.209,
  },
  {
    id: 'madrid',
    title: 'Archivo vivo de plazas historicas',
    subtitle: 'Madrid, Espana',
    country: 'Spain',
    image: '/images/reales/catedral.jpg',
    lat: 40.417,
    lng: -3.704,
  },
  {
    id: 'newyork',
    title: 'Museos de memoria colectiva',
    subtitle: 'New York, USA',
    country: 'United States',
    image: '/images/reales/ferrocarril.jpg',
    lat: 40.712,
    lng: -74.006,
  },
  {
    id: 'bogota',
    title: 'Arte en barrios historicos',
    subtitle: 'Bogota, Colombia',
    country: 'Colombia',
    image: '/images/reales/huapalcalco.jpg',
    lat: 4.711,
    lng: -74.072,
  },
];

const tulancingoExperience = experiences[0];

const localExperiences: LocalExperience[] = [
  {
    id: 'catedral',
    title: 'Catedral Metropolitana de Tulancingo',
    image: '/images/reales/catedral.jpg',
    lat: 20.0806548,
    lng: -98.3678173,
  },
  {
    id: 'ferrocarril',
    title: 'Ferrocarril',
    image: '/images/reales/ferrocarril.jpg',
    lat: 20.0861398,
    lng: -98.3737483,
  },
  {
    id: 'huapalcalco',
    title: 'Zona Arqueologica Huapalcalco',
    image: '/images/reales/huapalcalco.jpg',
    lat: 20.1173063,
    lng: -98.3622241,
  },
];

const tulancingoMapCenter: [number, number] = [20.085, -98.37];

const experienceMarkerIcon = divIcon({
  className: 'experience-map-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ffb35a;box-shadow:0 0 0 4px rgba(255,179,90,0.22);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const FitLocalExperienceBounds = ({ points }: { points: LocalExperience[] }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = latLngBounds(points.map((item) => [item.lat, item.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [42, 42] });
  }, [map, points]);

  return null;
};

const toPoint = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const normalizeLng = (lng: number) => {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
};

const shortestLngDelta = (from: number, to: number) => {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
};

const appendRingSegments = (ring: number[][], radius: number, store: number[]) => {
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lng1, lat1] = ring[i] as LonLat;
    const [lng2, lat2] = ring[i + 1] as LonLat;
    const deltaLng = shortestLngDelta(lng1, lng2);

    // Skip pathological jumps that can generate giant triangle-like artifacts.
    if (Math.abs(deltaLng) > 120) continue;

    // Small interpolation smooths long edges so borders look natural on the sphere.
    const steps = 3;
    for (let s = 0; s < steps; s += 1) {
      const t1 = s / steps;
      const t2 = (s + 1) / steps;
      const lngT1 = normalizeLng(lng1 + deltaLng * t1);
      const lngT2 = normalizeLng(lng1 + deltaLng * t2);

      const p1 = toPoint(lat1 + (lat2 - lat1) * t1, lngT1, radius);
      const p2 = toPoint(lat1 + (lat2 - lat1) * t2, lngT2, radius);

      store.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
};

const CountryBorders = ({ radius }: { radius: number }) => {
  const [positions, setPositions] = useState<Float32Array | null>(null);

  useEffect(() => {
    let active = true;

    const loadBorders = async () => {
      const topology = await fetch(worldAtlasUrl).then((res) => res.json());
      const geo = feature(topology, topology.objects.countries) as unknown as SimpleFeatureCollection;
      const store: number[] = [];

      geo.features.forEach((f) => {
        if (f.geometry.type === 'Polygon') {
          (f.geometry.coordinates as number[][][]).forEach((ring) => appendRingSegments(ring, radius, store));
          return;
        }

        (f.geometry.coordinates as number[][][][]).forEach((polygon) => {
          polygon.forEach((ring) => appendRingSegments(ring, radius, store));
        });
      });

      if (active) {
        setPositions(new Float32Array(store));
      }
    };

    void loadBorders();

    return () => {
      active = false;
    };
  }, [radius]);

  if (!positions) return null;

  return (
    <lineSegments renderOrder={10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#f6ddbc" transparent opacity={0.9} depthTest={false} depthWrite={false} />
    </lineSegments>
  );
};

const LatitudeRings = ({ radius }: { radius: number }) => {
  const positions = useMemo(() => {
    const pts: number[] = [];
    const rings = [-60, -30, 0, 30, 60];

    rings.forEach((lat) => {
      for (let lng = -180; lng < 180; lng += 2) {
        const p1 = toPoint(lat, lng, radius);
        const p2 = toPoint(lat, lng + 2, radius);
        pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    });

    return new Float32Array(pts);
  }, [radius]);

  return (
    <lineSegments renderOrder={9}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#b89c77" transparent opacity={0.16} depthTest={false} depthWrite={false} />
    </lineSegments>
  );
};

const GlobeMarker = ({
  point,
  active,
  onHover,
  onLeave,
  onSelect,
}: {
  point: THREE.Vector3;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.2;
    ref.current.scale.setScalar(active ? pulse * 1.35 : pulse);
  });

  const pos = point.clone().normalize().multiplyScalar(2.03);

  return (
    <group
      ref={ref}
      position={pos}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onLeave();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh>
        <sphereGeometry args={[0.03, 20, 20]} />
        <meshBasicMaterial color="#ffc76d" toneMapped={false} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshBasicMaterial color="#ffad3b" transparent opacity={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
};

const GlobeScene = ({
  selectedId,
  onMarkerHover,
  onMarkerLeave,
  onMarkerSelect,
}: {
  selectedId: string;
  onMarkerHover: () => void;
  onMarkerLeave: () => void;
  onMarkerSelect: () => void;
}) => {
  const globeRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!globeRef.current) return;
    globeRef.current.rotation.y += 0.0013;
  });

  return (
    <group ref={globeRef}>
      <Stars radius={55} depth={28} count={1200} factor={2.6} fade speed={0.7} saturation={0} />

      <mesh>
        <sphereGeometry args={[1.985, 72, 72]} />
        <meshStandardMaterial
          color="#64442a"
          roughness={0.72}
          metalness={0.02}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      <LatitudeRings radius={2.01} />
      <CountryBorders radius={2.015} />

      <GlobeMarker
        point={toPoint(tulancingoExperience.lat, tulancingoExperience.lng, 2.02)}
        active={selectedId === tulancingoExperience.id}
        onHover={onMarkerHover}
        onLeave={onMarkerLeave}
        onSelect={onMarkerSelect}
      />

      <ambientLight intensity={0.48} />
      <pointLight position={[7, 4, 3]} intensity={0.95} color="#ffb35a" />
      <pointLight position={[-6, -4, -5]} intensity={0.22} color="#4e331e" />
    </group>
  );
};

interface WorldViewProps {
  onBack: () => void;
}

const WorldView: React.FC<WorldViewProps> = ({ onBack }) => {
  const [selectedId] = useState('tulancingo');
  const [panelState, setPanelState] = useState<'hidden' | 'preview' | 'pinned'>('hidden');
  const [showDetailedMap, setShowDetailedMap] = useState(false);

  const showExperiences = panelState !== 'hidden';

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#20160f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_52%,rgba(255,150,60,0.3),transparent_44%),radial-gradient(circle_at_42%_52%,rgba(255,130,30,0.09),transparent_70%)]" />

      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 text-white/85 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="museo-label text-[11px] tracking-[0.18em]">CULTURA EN ALTURA</span>
        </button>
      </header>

      <main className="relative z-20 grid h-full w-full grid-cols-1 items-center px-6 pb-10 pt-24 md:px-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-4 lg:pt-20">
        <section className="pointer-events-none order-2 mt-6 max-w-[440px] lg:order-1 lg:mt-0">
          <AnimatePresence>
            {showExperiences && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="pointer-events-auto rounded-[24px] border border-white/10 bg-black/45 p-6 shadow-2xl backdrop-blur-2xl"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="museo-label text-[10px] tracking-[0.2em] text-[#f6ddbc]">EXPERIENCIAS EN TULANCINGO</p>
                  {panelState === 'pinned' && (
                    <button
                      type="button"
                      onClick={() => setPanelState('hidden')}
                      className="rounded-full border border-white/15 bg-white/5 p-1.5 text-white/70 transition-colors hover:text-white"
                      aria-label="Cerrar experiencias"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {localExperiences.map((item) => (
                    <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
                      <img src={item.image} alt={item.title} className="h-20 w-20 rounded-xl object-cover" />
                      <p className="museo-body text-base text-white/85">{item.title}</p>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailedMap(true);
                    setPanelState('pinned');
                  }}
                  className="mt-4 w-full rounded-full border border-[#ffb35a]/50 bg-[#ffb35a]/10 px-4 py-2.5 text-center museo-label text-[10px] tracking-[0.18em] text-[#ffd7a5] transition-colors hover:bg-[#ffb35a]/20"
                >
                  VER UBICACIONES EN MAPA
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="order-1 h-[52vh] min-h-[340px] w-full lg:order-2 lg:h-[78vh] lg:w-[95%] lg:justify-self-center">
          <Canvas
            camera={{ position: [0, 0.1, 6], fov: 40 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            dpr={[1, 1.5]}
            className="h-full w-full"
            onPointerMissed={() => {
              if (panelState !== 'pinned') setPanelState('hidden');
            }}
          >
            <GlobeScene
              selectedId={selectedId}
              onMarkerHover={() => {
                if (panelState !== 'pinned') setPanelState('preview');
              }}
              onMarkerLeave={() => {
                if (panelState === 'preview') setPanelState('hidden');
              }}
              onMarkerSelect={() => setPanelState('pinned')}
            />
            <OrbitControls enablePan={false} minDistance={5.4} maxDistance={7.2} />
          </Canvas>
        </section>
      </main>

      <AnimatePresence>
        {showDetailedMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-4xl rounded-3xl border border-white/15 bg-[#1a120d] p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="museo-label text-[10px] tracking-[0.2em] text-[#f6ddbc]">MAPA DETALLADO</p>
                  <h3 className="museo-headline text-xl text-white">Ubicaciones de experiencias</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailedMap(false)}
                  className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition-colors hover:text-white"
                  aria-label="Cerrar mapa"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-[420px] overflow-hidden rounded-2xl border border-white/10">
                <MapContainer center={tulancingoMapCenter} zoom={12.5} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                  <FitLocalExperienceBounds points={localExperiences} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {localExperiences.map((item) => (
                    <Marker key={item.id} position={[item.lat, item.lng]} icon={experienceMarkerIcon}>
                      <Popup>
                        <div style={{ minWidth: 160 }}>
                          <strong>{item.title}</strong>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorldView;
