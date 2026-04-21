import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const BACKGROUND_VIDEOS = isMobile
  ? ['/videos/catedral-mobile.mp4', '/videos/ferrocarril-mobile.mp4', '/videos/piramides-mobile.mp4']
  : ['/videos/CATEDRAL.mp4', '/videos/FERRRO.MP4', '/videos/PIRAMIDES.MP4'];

interface LoginPageProps {
  onLogin: (payload: {
    mode: 'login' | 'register';
    email: string;
    password: string;
    fullName?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onBackHome: () => void;
  queryString?: string;
}

const LoginPage = ({ onLogin, onBackHome, queryString = '' }: LoginPageProps) => {
  const [mode, setMode] = useState<'login' | 'register'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'register' ? 'register' : 'login';
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
    }, 15000); // 15 segundos por escena
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const requestedMode = params.get('mode');
    const reason = params.get('reason');

    if (requestedMode === 'register') {
      setMode('register');
    }

    if (reason === 'video') {
      setContextMessage('Para ver este video compartido necesitas una cuenta. Regístrate o inicia sesión.');
      return;
    }

    setContextMessage(null);
  }, [queryString]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'register' && fullName.trim().length < 3) {
      setErrorMessage('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
      if (!strongPassword.test(password)) {
        setErrorMessage('Usa una contraseña más segura: mayúscula, minúscula, número y símbolo.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await onLogin({
      mode,
      email: email.trim(),
      password,
      fullName: mode === 'register' ? fullName.trim() : undefined,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.message || 'No se pudo iniciar sesión. Intenta de nuevo.');
      return;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-0 bg-black flex items-center justify-center overflow-hidden pointer-events-none">
        {/* Capa base oscura */}
        <div className="absolute inset-0 bg-[#1a1410] z-0" />
        
        {/* Videos con Transición Suave y Efecto Respiración (Scale) */}
        {BACKGROUND_VIDEOS.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[3000ms] ease-in-out ${
              index === currentVideoIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className={`min-w-full min-h-full object-cover transform-gpu transition-transform duration-[20000ms] ease-linear ${
                index === currentVideoIndex ? 'scale-100' : 'scale-110'
              }`}
              src={src}
            />
          </div>
        ))}
        
        {/* Filtros Cinematográficos Superpuestos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/80 z-20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] z-20" />
        
        {/* Textura sutil y ruido */}
        <div 
          className="absolute inset-0 opacity-[0.03] z-20" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }}
        />

        {/* Indicadores Minimalistas Estilo Película */}
        <div className="absolute bottom-10 w-full flex justify-center gap-3 z-30">
          {BACKGROUND_VIDEOS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentVideoIndex(index)}
              className={`h-[2px] transition-all duration-[1200ms] rounded-full overflow-hidden ${
                index === currentVideoIndex ? 'w-12 bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'w-4 bg-white/20 hover:bg-white/40 cursor-pointer pointer-events-auto'
              }`}
            />
          ))}
        </div>
      </div>

      <main className="relative z-30 flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 overflow-y-auto overflow-x-hidden">
        
        {/* Back button (floating top left) */}
        <button
          onClick={onBackHome}
          className="absolute top-8 left-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xs font-bold tracking-[0.2em] uppercase z-20"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {/* Centered Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[500px] bg-white/5 backdrop-blur-[24px] rounded-[2.5rem] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col p-10 md:p-14 overflow-hidden -mt-16 md:-mt-24"
        >
          {/* Subtle top reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div className="flex flex-col items-center text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
              ¡Cultura<br />en Altura!
            </h1>
            <p className="text-white/60 text-[15px] leading-relaxed max-w-[320px]">
              {mode === 'login' ? 'Tu gran aventura te espera. Inicia sesión para descubrirla.' : 'Regístrate para vivir la experiencia completa.'}
            </p>
          </div>

          <div className="w-full relative z-10">
            {contextMessage && (
              <div className="mb-6 bg-blue-500/10 border border-blue-400/30 text-blue-100 text-[12px] p-3 rounded-lg">
                {contextMessage}
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex bg-white/5 backdrop-blur-md border border-white/10 p-1.5 rounded-[1rem] mb-10 shadow-inner">
              <motion.button
                type="button"
                whileHover={{ scale: mode === 'login' ? 1 : 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMode('login'); setErrorMessage(null); setEmail(''); setPassword(''); setFullName(''); setConfirmPassword(''); }}
                className={`flex-1 py-3.5 text-[12px] font-bold tracking-widest uppercase rounded-xl transition-all ${mode === 'login' ? 'bg-white/10 backdrop-blur-lg border border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white/90 bg-transparent border border-transparent'}`}
              >
                Iniciar Sesión
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: mode === 'register' ? 1 : 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMode('register'); setErrorMessage(null); setEmail(''); setPassword(''); setFullName(''); setConfirmPassword(''); }}
                className={`flex-1 py-3.5 text-[12px] font-bold tracking-widest uppercase rounded-xl transition-all ${mode === 'register' ? 'bg-white/10 backdrop-blur-lg border border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white/90 bg-transparent border border-transparent'}`}
              >
                Registro
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">
              <AnimatePresence mode="popLayout">
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 text-white text-[13px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40 shadow-inner"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                type="email"
                placeholder="Correo electrónico"
                required
                autoComplete="one-time-code"
                name="login-email-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 text-white text-[13px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40 shadow-inner"
              />
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  required
                  autoComplete="new-password"
                  name="login-pass-field"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white text-[13px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40 shadow-inner"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      type="password"
                      placeholder="Confirmar contraseña"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 text-white text-[13px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-white/40 shadow-inner"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] p-3 rounded-lg flex gap-2 items-start mt-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-8 relative group perspective-1000">
                {/* Glow behind the button */}
                <div className="absolute inset-0 bg-white/10 blur-xl rounded-[1rem] group-hover:bg-white/20 transition-colors duration-500"></div>
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02, rotateX: 5 }}
                  whileTap={{ scale: 0.97, rotateX: 0 }}
                  className="w-full relative z-10 bg-white/10 backdrop-blur-2xl border border-white/30 border-b-white/10 text-white font-black text-[12px] uppercase tracking-[0.15em] px-8 py-4 rounded-[1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:grayscale overflow-hidden"
                >
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{isSubmitting ? 'Procesando...' : (mode === 'login' ? 'Comenzar Recorrido' : 'Crear Cuenta')}</span>
                  
                  {/* Liquid shine effect on hover */}
                  <div className="absolute top-0 bottom-0 -left-[100%] w-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-30deg] group-hover:left-[200%] transition-all duration-1000 ease-out pointer-events-none"></div>
                </motion.button>
              </div>

            </form>
          </div>
        </motion.div>
      </main>
    </>
  );
};

export default LoginPage;