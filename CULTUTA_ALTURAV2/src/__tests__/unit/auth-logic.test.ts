import { describe, it, expect, vi } from 'vitest';

/** Tests de la lógica de autenticación usada en App.tsx */

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

describe('mapAuthError() - mapeo de errores de autenticación', () => {
  it('mapea credenciales inválidas', () => {
    expect(mapAuthError('Invalid login credentials')).toBe(
      'Correo o contraseña incorrectos. Si no tienes cuenta, regístrate primero.'
    );
  });

  it('mapea usuario ya registrado', () => {
    expect(mapAuthError('User already registered')).toBe(
      'Este correo ya está registrado. Inicia sesión con tu contraseña.'
    );
  });

  it('mapea contraseña muy corta', () => {
    expect(mapAuthError('Password should be at least 8 characters')).toBe(
      'La contraseña debe tener al menos 8 caracteres.'
    );
  });

  it('mapea email inválido', () => {
    expect(mapAuthError('Unable to validate email address')).toBe(
      'El correo electrónico no es válido.'
    );
  });

  it('devuelve el mensaje original si no se reconoce', () => {
    const msg = 'Some unknown error';
    expect(mapAuthError(msg)).toBe(msg);
  });

  it('maneja case insensitive', () => {
    expect(mapAuthError('INVALID LOGIN CREDENTIALS')).toBe(
      'Correo o contraseña incorrectos. Si no tienes cuenta, regístrate primero.'
    );
  });
});

describe('Lógica de rutas protegidas', () => {
  function shouldRedirectToLogin(pathname: string, authUser: boolean): boolean {
    const isProtectedPath = pathname === '/comunidad' || pathname === '/admin' || pathname.startsWith('/perfil');
    return isProtectedPath && !authUser;
  }

  function shouldRedirectAdmin(pathname: string, authUser: boolean, isAdmin: boolean): string | null {
    if (pathname === '/admin' && authUser && !isAdmin) return '/comunidad';
    if (pathname === '/comunidad' && authUser && isAdmin) return '/admin';
    return null;
  }

  it('redirige a login para rutas protegidas sin auth', () => {
    expect(shouldRedirectToLogin('/comunidad', false)).toBe(true);
    expect(shouldRedirectToLogin('/admin', false)).toBe(true);
    expect(shouldRedirectToLogin('/perfil/user-1', false)).toBe(true);
  });

  it('no redirige para rutas públicas', () => {
    expect(shouldRedirectToLogin('/', false)).toBe(false);
    expect(shouldRedirectToLogin('/recorrido/catedral', false)).toBe(false);
    expect(shouldRedirectToLogin('/login', false)).toBe(false);
  });

  it('no redirige si hay usuario autenticado', () => {
    expect(shouldRedirectToLogin('/comunidad', true)).toBe(false);
    expect(shouldRedirectToLogin('/admin', true)).toBe(false);
  });

  it('redirige admin de /comunidad a /admin', () => {
    expect(shouldRedirectAdmin('/comunidad', true, true)).toBe('/admin');
  });

  it('redirige no-admin de /admin a /comunidad', () => {
    expect(shouldRedirectAdmin('/admin', true, false)).toBe('/comunidad');
  });

  it('no redirige si el rol corresponde', () => {
    expect(shouldRedirectAdmin('/admin', true, true)).toBeNull();
    expect(shouldRedirectAdmin('/comunidad', true, false)).toBeNull();
  });
});

describe('Detección de dispositivo móvil', () => {
  function canUseAr(isMobileUA: boolean, hasTouchInput: boolean, isTouchPointer: boolean): boolean {
    return isMobileUA || hasTouchInput || isTouchPointer;
  }

  it('permite AR en dispositivos móviles', () => {
    expect(canUseAr(true, true, true)).toBe(true);
  });

  it('permite AR con touch input', () => {
    expect(canUseAr(false, true, false)).toBe(true);
  });

  it('no permite AR en escritorio sin touch', () => {
    expect(canUseAr(false, false, false)).toBe(false);
  });
});
