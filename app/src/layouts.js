// Layout geometry: every layout turns a canvas size into panel rectangles (centre, size, rotation).
export const LAYOUTS = [
  { id: 'grid4', name: 'Classic 4' },
  { id: 'hero', name: 'Hero + 3' },
  { id: 'grid9', name: '9 Grid' },
  { id: 'full', name: 'Full Bleed' },
  { id: 'snaps', name: 'Snapshots', dark: true },
];
export const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
export const dividerGap = (W, H) => Math.max(2, Math.round(Math.min(W, H) * 0.011));

function grid(x, y, w, h, cols, rows, g) {
  const cw = (w - g * (cols - 1)) / cols, ch = (h - g * (rows - 1)) / rows, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ cx: x + c * (cw + g) + cw / 2, cy: y + r * (ch + g) + ch / 2, w: cw, h: ch, rot: 0 });
  return out;
}

function heroRects(x, y, w, h, g, W, H) {
  if (W / H > 1.2) {
    const bw = (w - g) * 0.66, sw = w - g - bw, sh = (h - 2 * g) / 3;
    return [{ cx: x + bw / 2, cy: y + h / 2, w: bw, h, rot: 0 },
      ...[0, 1, 2].map((i) => ({ cx: x + bw + g + sw / 2, cy: y + i * (sh + g) + sh / 2, w: sw, h: sh, rot: 0 }))];
  }
  const bh = (h - g) * 0.62, sh = h - g - bh, sw = (w - 2 * g) / 3;
  return [{ cx: x + w / 2, cy: y + bh / 2, w, h: bh, rot: 0 },
    ...[0, 1, 2].map((i) => ({ cx: x + i * (sw + g) + sw / 2, cy: y + bh + g + sh / 2, w: sw, h: sh, rot: 0 }))];
}

// Tilted snapshots: white-framed photos at slight angles; `frame` is the border around the photo rect.
function snapRects(W, H) {
  const rots = [-5, 4, -3, 6].map((d) => (d * Math.PI) / 180);
  const wide = W / H > 1.2;
  const size = wide ? Math.min(W / 4.4, H * 0.62) : Math.min(W / 2.25, H / 2.8);
  const pad = size * 0.07, bottom = size * 0.22;
  const centres = wide
    ? [[0.13, 0.46], [0.37, 0.54], [0.62, 0.45], [0.87, 0.53]]
    : [[0.27, 0.3], [0.73, 0.28], [0.3, 0.71], [0.71, 0.73]];
  return centres.map(([fx, fy], i) => ({ cx: fx * W, cy: fy * H - (bottom - pad) / 2, w: size, h: size, rot: rots[i], frame: { pad, bottom } }));
}

export function panelRects(id, W, H) {
  const g = dividerGap(W, H), m = g * 2, x = m, y = m, w = W - 2 * m, h = H - 2 * m;
  switch (id) {
    case 'hero': return heroRects(x, y, w, h, g, W, H);
    case 'grid9': return grid(x, y, w, h, 3, 3, g);
    case 'full': return [{ cx: W / 2, cy: H / 2, w: W - 2 * g, h: H - 2 * g, rot: 0 }];
    case 'snaps': return snapRects(W, H);
    default: return grid(x, y, w, h, 2, 2, g);
  }
}

// Which panel is under point (px, py)? Topmost (last drawn) wins.
export function hitPanel(rects, px, py) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i], dx = px - r.cx, dy = py - r.cy, c = Math.cos(-r.rot), s = Math.sin(-r.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}
