import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() - merge de clases Tailwind', () => {
  it('combina clases simples', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('maneja valores condicionales', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('resuelve conflictos de Tailwind (último gana)', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('ignora undefined y null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('maneja strings vacíos', () => {
    expect(cn('', 'a', '')).toBe('a');
  });

  it('maneja arrays de clases', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });
});
