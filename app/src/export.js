// PNG export: re-renders the cover at the chosen post size on an offscreen canvas and downloads it.
import { renderCover } from './render.js';
import { SIZES } from './state.js';

export function exportBlob(state) {
  const { w, h } = SIZES[state.size];
  const canvas = document.createElement('canvas');
  renderCover(canvas, state, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'));
}

export async function exportPng(state) {
  const blob = await exportBlob(state);
  const { w, h } = SIZES[state.size];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-coast-cover-${state.layout}-${w}x${h}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return blob;
}
