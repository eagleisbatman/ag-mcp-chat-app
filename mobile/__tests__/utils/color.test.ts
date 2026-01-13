/**
 * Tests for color utility functions
 */

import { withAlpha, lighten, darken } from '../../utils/color';

describe('withAlpha', () => {
  it('converts hex color to rgba with alpha', () => {
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('handles 3-character hex codes', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('handles dark colors', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('handles mid-range colors', () => {
    expect(withAlpha('#808080', 0.75)).toBe('rgba(128, 128, 128, 0.75)');
  });

  it('clamps alpha to 0-1 range', () => {
    expect(withAlpha('#ffffff', 1.5)).toBe('rgba(255, 255, 255, 1)');
    expect(withAlpha('#ffffff', -0.5)).toBe('rgba(255, 255, 255, 0)');
  });

  it('returns original color if not a valid hex', () => {
    expect(withAlpha('rgb(255, 0, 0)', 0.5)).toBe('rgb(255, 0, 0)');
    expect(withAlpha('red', 0.5)).toBe('red');
  });

  it('handles null/undefined input', () => {
    expect(withAlpha(null, 0.5)).toBe('');
    expect(withAlpha(undefined, 0.5)).toBe('');
  });

  it('handles invalid hex length', () => {
    expect(withAlpha('#ff', 0.5)).toBe('#ff');
    expect(withAlpha('#fffff', 0.5)).toBe('#fffff');
  });
});

describe('lighten', () => {
  it('lightens a color by the specified amount', () => {
    const result = lighten('#000000', 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // Should be around #808080
    expect(result).toBe('#808080');
  });

  it('caps at white (#ffffff)', () => {
    const result = lighten('#ffffff', 0.5);
    expect(result).toBe('#ffffff');
  });

  it('handles 3-char hex codes', () => {
    const result = lighten('#000', 0.25);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns original for non-hex colors', () => {
    expect(lighten('red', 0.5)).toBe('red');
  });
});

describe('darken', () => {
  it('darkens a color by the specified amount', () => {
    const result = darken('#ffffff', 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // Should be around #808080
    expect(result).toBe('#808080');
  });

  it('caps at black (#000000)', () => {
    const result = darken('#000000', 0.5);
    expect(result).toBe('#000000');
  });

  it('handles 3-char hex codes', () => {
    const result = darken('#fff', 0.25);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns original for non-hex colors', () => {
    expect(darken('red', 0.5)).toBe('red');
  });
});
