// Colour grades: a CSS-style canvas filter plus gradient overlays blended with globalCompositeOperation.
// layers: { op, dir: 'v'|'d'|'h', stops: [[pos, colour]...], alpha }
export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', swatch: ['#ff3d8b', '#ff9a3c'], filter: 'saturate(1.2) contrast(1.12) brightness(1.02)', vignette: 0.28,
    layers: [{ op: 'soft-light', dir: 'v', alpha: 1, stops: [[0, '#ff2d8a'], [0.55, '#ff6f61'], [1, '#ffb347']] },
      { op: 'screen', dir: 'v', alpha: 0.2, stops: [[0, '#6a1b9a'], [1, '#ff8a3d']] },
      { op: 'overlay', dir: 'v', alpha: 0.28, stops: [[0, '#ff4fa0'], [1, '#ffd36a']] }] },
  { id: 'neon', name: 'Neon Nights', swatch: ['#18e0e8', '#ff2fc8'], filter: 'saturate(1.2) contrast(1.2) brightness(0.96)', vignette: 0.35,
    layers: [{ op: 'soft-light', dir: 'd', alpha: 1, stops: [[0, '#00e5ff'], [1, '#ff1fc4']] },
      { op: 'overlay', dir: 'd', alpha: 0.35, stops: [[0, '#00c8ff'], [1, '#ff3fd0']] },
      { op: 'multiply', dir: 'v', alpha: 0.25, stops: [[0, '#b9a6ff'], [1, '#ffffff']] }] },
  { id: 'golden', name: 'Golden Hour', swatch: ['#ffd36a', '#ff8a2b'], filter: 'sepia(0.3) saturate(1.3) contrast(1.05) brightness(1.06)', vignette: 0.18,
    layers: [{ op: 'soft-light', dir: 'v', alpha: 0.9, stops: [[0, '#ffc34d'], [1, '#ff8a2b']] },
      { op: 'screen', dir: 'h', alpha: 0.12, stops: [[0, '#ffb86b'], [1, '#ff7a3a']] }] },
  { id: 'noir', name: 'Noir', swatch: ['#f2f2f2', '#111111'], filter: 'grayscale(1) contrast(1.45) brightness(0.95)', vignette: 0.45, layers: [] },
  { id: 'clean', name: 'Clean', swatch: ['#bfe9ff', '#fff4e0'], filter: 'saturate(1.08) contrast(1.05)', vignette: 0.06, layers: [] },
];
export const gradeById = (id) => GRADES.find((g) => g.id === id) || GRADES[0];

function gradient(ctx, dir, w, h, stops) {
  const g = dir === 'h' ? ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    : dir === 'd' ? ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
    : ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}

// Paint the grade's overlays over a panel rectangle centred on the current origin.
export function paintGrade(ctx, grade, w, h) {
  const x = -w / 2, y = -h / 2;
  for (const l of grade.layers) {
    ctx.globalCompositeOperation = l.op; ctx.globalAlpha = l.alpha;
    ctx.fillStyle = gradient(ctx, l.dir, w, h, l.stops);
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (grade.vignette) {
    const r = Math.hypot(w, h) / 2, v = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,0,25,${grade.vignette})`);
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  }
}
