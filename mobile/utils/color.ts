/**
 * Color utility functions
 */

/**
 * Add alpha transparency to a hex color
 * @param color - Hex color string (e.g., '#ffffff' or '#fff')
 * @param alpha - Alpha value between 0 and 1
 * @returns rgba color string
 */
export function withAlpha(color: string | null | undefined, alpha: number): string {
  if (!color || typeof color !== 'string') return color || '';

  const normalized = color.trim();
  if (!normalized.startsWith('#')) return color;

  let hex = normalized.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }
  if (hex.length !== 6) return color;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Lighten a hex color
 * @param color - Hex color string
 * @param amount - Amount to lighten (0-1)
 */
export function lighten(color: string, amount: number): string {
  if (!color || !color.startsWith('#')) return color;

  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }

  const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + Math.round(255 * amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color
 * @param color - Hex color string
 * @param amount - Amount to darken (0-1)
 */
export function darken(color: string, amount: number): string {
  if (!color || !color.startsWith('#')) return color;

  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }

  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - Math.round(255 * amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default {
  withAlpha,
  lighten,
  darken,
};
