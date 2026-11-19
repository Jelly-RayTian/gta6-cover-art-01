// Editor state: the nine panel slots, the chosen layout/grade/size/caption, and change notification.
export const SLOTS = 9;
export const SIZES = { sq: { name: '1080 × 1080', w: 1080, h: 1080 }, portrait: { name: '1080 × 1350', w: 1080, h: 1350 }, wide: { name: '1920 × 1080', w: 1920, h: 1080 } };
// Preset crops [zoom, offsetX, offsetY] so one photo gives different-looking panels.
export const CROPS = [[1, 0, 0], [1.6, 0.5, -0.4], [1.3, -0.6, 0.5], [2, 0.3, 0.6], [1.5, -0.4, -0.5], [1.2, 0.7, 0.2], [1.8, -0.2, 0.3], [1.4, 0.1, -0.7], [2.2, -0.5, 0]];

export const state = {
  layout: 'grid4', grade: 'vice', size: 'sq',
  title: 'Neon Coast', sub: 'Summer in the city', color: 'sunset', pos: 'bottom',
  sel: 0,
  panels: Array.from({ length: SLOTS }, () => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export const emit = () => listeners.forEach((fn) => fn());

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

export async function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  try { return await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

export function setPhoto(i, img, crop = [1, 0, 0]) {
  const p = state.panels[i];
  p.img = img; [p.zoom, p.ox, p.oy] = crop;
}

export function setAllPhotos(img) {
  state.panels.forEach((_, i) => setPhoto(i, img, CROPS[i]));
}

export function resetCrop(i) {
  const p = state.panels[i]; p.zoom = 1; p.ox = 0; p.oy = 0;
}
