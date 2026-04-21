import { describe, it, expect } from 'vitest';
import { authApi, profilesApi } from '@/lib/api';

describe('Flujo de autenticación completo', () => {
  it('login exitoso con credenciales válidas', async () => {
    const result = await authApi.signIn('test@example.com', 'test123');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.session).toBeDefined();
  });

  it('login fallido con credenciales inválidas', async () => {
    await expect(authApi.signIn('wrong@example.com', 'wrong'))
      .rejects.toThrow();
  });

  it('login de admin devuelve usuario admin', async () => {
    const result = await authApi.signIn('admin@example.com', 'admin123');
    expect(result.user.email).toBe('admin@example.com');
  });

  it('registro con email ya existente falla', async () => {
    await expect(authApi.signUp('existing@example.com', 'password123', 'Test'))
      .rejects.toThrow();
  });

  it('registro de nuevo usuario exitoso', async () => {
    const result = await authApi.signUp('new@example.com', 'password123', 'Nuevo Usuario');
    expect(result.user).toBeDefined();
  });
});

describe('Flujo de verificación de rol', () => {
  it('verificar que admin tiene is_admin = true', async () => {
    const isAdmin = await profilesApi.isAdmin('admin-1');
    expect(isAdmin).toBe(true);
  });

  it('verificar que usuario normal no es admin', async () => {
    const isAdmin = await profilesApi.isAdmin('user-1');
    expect(isAdmin).toBe(false);
  });

  it('usuario inexistente no es admin', async () => {
    const isAdmin = await profilesApi.isAdmin('nonexistent');
    expect(isAdmin).toBe(false);
  });
});
