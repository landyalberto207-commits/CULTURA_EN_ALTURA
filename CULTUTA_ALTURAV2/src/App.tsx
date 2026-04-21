import { useCallback, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CommunityPortalPage from './pages/CommunityPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import CatedralTourPage from './pages/CatedralTourPage';
import FerrocarrilTourPage from './pages/FerrocarrilTourPage';
import PiramidesTourPage from './pages/PiramidesTourPage';
import ProfilePage from './pages/ProfilePage';
import ARViewerPage from './pages/ARViewerPage';
import WorldView from './sections/WorldView';
import { CustomCursor } from './components/CustomCursor';
import { supabase } from '@/lib/supabase';

type AuthPayload = {
  mode: 'login' | 'register';
  email: string;
  password: string;
  fullName?: string;
};

type AuthResult = {
  ok: boolean;
  message?: string;
};

const mapAuthError = (rawMessage: string) => {
  const m = rawMessage.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Si no tienes cuenta, regístrate primero.';
  }

  if (m.includes('user already registered')) {
    return 'Este correo ya está registrado. Inicia sesión con tu contraseña.';
  }

  if (m.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  if (m.includes('unable to validate email address')) {
    return 'El correo electrónico no es válido.';
  }

  return rawMessage;
};

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [searchParams, setSearchParams] = useState(window.location.search);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const isProfilePath = pathname === '/perfil' || pathname.startsWith('/perfil/');
  const profileRouteId = pathname.startsWith('/perfil/')
    ? decodeURIComponent(pathname.replace('/perfil/', '').split('/')[0] || '')
    : null;
  const sharedVideoId = pathname === '/comunidad'
    ? new URLSearchParams(searchParams).get('video')
    : null;
  const isTouchPointer = window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const hasTouchInput = navigator.maxTouchPoints > 0;
  // Always allow AR route for mobile devices
  const canUseArRoute = isMobileUA || hasTouchInput || isTouchPointer;

  const navigate = useCallback((to: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setPathname(window.location.pathname);
    setSearchParams(window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchAdminStatus = useCallback(async (userId: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      setRoleReady(true);
      return false;
    }

    setRoleReady(false);
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setIsAdmin(false);
      setRoleReady(true);
      return false;
    }

    const profile = data as { is_admin?: boolean } | null;
    const admin = Boolean(profile?.is_admin);
    setIsAdmin(admin);
    setRoleReady(true);
    return admin;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('No se pudo obtener la sesion:', error.message);
      }

      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
      await fetchAdminStatus(data.session?.user?.id ?? null);
      setAuthReady(true);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAuthUser(session?.user ?? null);
      void fetchAdminStatus(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
      setSearchParams(window.location.search);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (!authReady || !roleReady) return;

    const isProtectedPath = pathname === '/comunidad' || pathname === '/admin' || isProfilePath;
    if (isProtectedPath && !authUser) {
      const redirectTarget = `${pathname}${searchParams || ''}`;
      const requiresRegisterForVideo =
        pathname === '/comunidad' && new URLSearchParams(searchParams).has('video');
      const extraParams = requiresRegisterForVideo ? '&mode=register&reason=video' : '';
      navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}${extraParams}`, true);
      return;
    }

    if (pathname === '/admin' && authUser && !isAdmin) {
      navigate('/comunidad', true);
      return;
    }

    if (pathname === '/comunidad' && authUser && isAdmin) {
      navigate('/admin', true);
    }
  }, [pathname, searchParams, authReady, roleReady, authUser, isAdmin, isProfilePath, navigate]);

  const handleAuth = async (payload: AuthPayload): Promise<AuthResult> => {
    if (payload.mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (error) {
        return { ok: false, message: mapAuthError(error.message) };
      }

      const admin = await fetchAdminStatus(data.user?.id ?? null);
      const params = new URLSearchParams(searchParams);
      const requestedRedirect = params.get('redirect');
      let redirectTo = requestedRedirect || (admin ? '/admin' : '/comunidad');

      if (redirectTo === '/admin' && !admin) {
        redirectTo = '/comunidad';
      }

      if (redirectTo === '/comunidad' && admin) {
        redirectTo = '/admin';
      }

      navigate(redirectTo, true);
      return { ok: true };
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName?.trim() || 'Usuario de la comunidad',
        },
      },
    });

    if (error) {
      return { ok: false, message: mapAuthError(error.message) };
    }

    if (!data.session) {
      return {
        ok: true,
        message: 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.',
      };
    }

    const params = new URLSearchParams(searchParams);
    const redirectTo = params.get('redirect') || '/comunidad';
    navigate(redirectTo, true);
    return { ok: true };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRoleReady(true);
    navigate('/', true);
  };

  const authResolved = authReady && roleReady;

  return (
    <>
      <CustomCursor />
      {pathname === '/login' && (
        <LoginPage
          onLogin={handleAuth}
          onBackHome={() => navigate('/', true)}
          queryString={searchParams}
        />
      )}
      {pathname === '/comunidad' && authResolved && authUser && !isAdmin && (
        <CommunityPortalPage
          currentUserId={authUser.id}
          onNavigate={navigate}
          sharedVideoId={sharedVideoId}
        />
      )}
      {pathname === '/admin' && authResolved && authUser && isAdmin && (
        <AdminPortalPage currentUserId={authUser.id} onNavigate={navigate} />
      )}
      {isProfilePath && authResolved && authUser && (
        <ProfilePage
          onLogout={handleLogout}
          currentUserId={authUser.id}
          profileUserId={profileRouteId || authUser.id}
          onNavigate={navigate}
        />
      )}
      {pathname === '/recorrido/catedral' && (
        <CatedralTourPage isLoggedIn={Boolean(authUser)} onNavigate={navigate} />
      )}
      {pathname === '/recorrido/ferrocarril' && (
        <FerrocarrilTourPage isLoggedIn={Boolean(authUser)} onNavigate={navigate} />
      )}
      {pathname === '/recorrido/piramides' && (
        <PiramidesTourPage isLoggedIn={Boolean(authUser)} onNavigate={navigate} />
      )}
      {pathname === '/ar' && canUseArRoute && (
        <ARViewerPage onNavigate={navigate} iosSrc="/modelos/777-hq.usdz" />
      )}
      {pathname === '/ar/catedral' && canUseArRoute && (
        <ARViewerPage onNavigate={navigate} modelSrc="/modelos/777-hq.glb" iosSrc="/modelos/777-hq.usdz" modelAlt="Catedral de Tulancingo 3D" backTo="/recorrido/catedral" />
      )}
      {pathname === '/ar/ferrocarril' && canUseArRoute && (
        <ARViewerPage onNavigate={navigate} modelSrc="/modelos/ferro.glb" iosSrc="/modelos/ferro.usdz" modelAlt="Ferrocarril de Tulancingo 3D" backTo="/recorrido/ferrocarril" />
      )}
      {pathname === '/ar/piramides' && canUseArRoute && (
        <ARViewerPage onNavigate={navigate} modelSrc="/modelos/piramides-lite.glb" iosSrc="/modelos/piramides-lite.usdz" modelAlt="Pirámides Huapalcalco 3D" backTo="/recorrido/piramides" />
      )}
      {pathname === '/ar' && !canUseArRoute && (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/45 p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/65 mb-2">VR / AR</p>
            <h1 className="text-lg font-semibold text-white mb-2">Disponible solo en movil</h1>
            <p className="text-sm text-white/75 mb-4">
              Abre esta experiencia desde un telefono para activar el visor AR.
            </p>
            <button
              type="button"
              onClick={() => navigate('/', true)}
              className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.12em] text-white"
            >
              Volver al inicio
            </button>
          </div>
        </main>
      )}
      {(pathname === '/ar/catedral' || pathname === '/ar/ferrocarril' || pathname === '/ar/piramides') && !canUseArRoute && (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/45 p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/65 mb-2">VR / AR</p>
            <h1 className="text-lg font-semibold text-white mb-2">Disponible solo en movil</h1>
            <p className="text-sm text-white/75 mb-4">
              Abre esta experiencia desde un telefono para activar el visor AR.
            </p>
            <button type="button" onClick={() => navigate('/', true)}
              className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.12em] text-white">
              Volver al recorrido
            </button>
          </div>
        </main>
      )}
      {pathname === '/mundo' && (
        <WorldView onBack={() => navigate('/', true)} />
      )}
      {pathname !== '/login' && pathname !== '/comunidad' && pathname !== '/admin' && pathname !== '/recorrido/catedral' && pathname !== '/recorrido/ferrocarril' && pathname !== '/recorrido/piramides' && pathname !== '/ar' && pathname !== '/ar/catedral' && pathname !== '/ar/ferrocarril' && pathname !== '/ar/piramides' && pathname !== '/mundo' && !isProfilePath && (
        <LandingPage isLoggedIn={Boolean(authUser)} onNavigate={navigate} />
      )}
    </>
  );
}

export default App;
