export function withAlpha(color, alpha) {
  if (!color || typeof color !== 'string') return color;

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

