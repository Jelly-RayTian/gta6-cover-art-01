// Fixed scenes for screenshots. ?shot=cover shows the cover alone, ?shot=editor shows the whole editor.
// Queries: photo (pier|boulevard|mix), caption, sub, layout, grade, size, color, pos. window.__shotReady is set once painted.
import { state, setAllPhotos, setPhoto, CROPS, loadImage, emit } from './state.js';

export async function runShot(shot, query) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const pier = await loadImage('samples/pier.jpg'), blvd = await loadImage('samples/boulevard.jpg');
  if (photo === 'mix') state.panels.forEach((_, i) => setPhoto(i, i % 2 ? blvd : pier, CROPS[i]));
  else setAllPhotos(photo === 'boulevard' ? blvd : pier);
  for (const k of ['layout', 'grade', 'size', 'color', 'pos']) if (query.get(k)) state[k] = query.get(k);
  // flip=1,3,5 mirrors those panels (1-based); tracking=<percent>; outline=1
  for (const n of (query.get('flip') || '').split(',')) { const p = state.panels[Number(n) - 1]; if (p) p.flip = true; }
  if (query.get('tracking') !== null) state.tracking = Number(query.get('tracking'));
  if (query.get('outline')) state.outline = query.get('outline') === '1';
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('sub') !== null) state.sub = query.get('sub');
  await document.fonts.load('100px Anton');
  emit();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
