// Boot and UI wiring: builds the controls, connects them to state, re-renders the preview, handles panel gestures.
import { state, SIZES, CROPS, onChange, emit, loadImage, loadImageFile, setPhoto, setAllPhotos, resetCrop } from './state.js';
import { LAYOUTS, panelRects, hitPanel } from './layouts.js';
import { GRADES } from './grades.js';
import { renderCover, overflow } from './render.js';
import { exportPng } from './export.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const samples = {};
let rects = [];

const COLORS = [['white', '#ffffff'], ['sunset', 'linear-gradient(#fff07a,#ff3d8b,#a53cff)'], ['neon', '#ff5ee0']];

function previewSize() {
  const { w, h } = SIZES[state.size], k = Math.min(1, 1200 / Math.max(w, h));
  return [w * k, h * k];
}

let queued = false;
function schedule() {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; paint(); });
}
function paint() {
  const [w, h] = previewSize();
  rects = renderCover(canvas, state, w, h, { preview: !document.body.classList.contains('shot-cover') });
  syncControls();
}

function chip(parent, cls, html, onClick) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; b.onclick = onClick; parent.appendChild(b); return b;
}

function drawThumb(c, id) {
  c.width = c.height = 88; const ctx = c.getContext('2d');
  const dark = id === 'snaps';
  ctx.fillStyle = dark ? '#3a1060' : '#f3ecdf'; ctx.fillRect(0, 0, 88, 88);
  panelRects(id, 88, 88).forEach((r, i) => {
    ctx.save(); ctx.translate(r.cx, r.cy); ctx.rotate(r.rot);
    if (r.frame) { ctx.fillStyle = '#fff'; ctx.fillRect(-r.w / 2 - r.frame.pad, -r.h / 2 - r.frame.pad, r.w + 2 * r.frame.pad, r.h + r.frame.pad + r.frame.bottom); }
    const g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    g.addColorStop(0, ['#ff3d8b', '#7a2cff', '#2fe6f0', '#ff9a3c'][i % 4]); g.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = g; ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h); ctx.restore();
  });
}

function buildControls() {
  LAYOUTS.forEach((l) => {
    const b = chip($('layouts'), '', `<canvas></canvas>${l.name}`, () => { state.layout = l.id; emit(); });
    b.dataset.id = l.id; b.title = l.name; drawThumb(b.firstChild, l.id);
  });
  GRADES.forEach((g) => {
    const b = chip($('grades'), '', `<span class="sw" style="background:linear-gradient(135deg,${g.swatch[0]},${g.swatch[1]})"></span>${g.name}`, () => { state.grade = g.id; emit(); });
    b.dataset.id = g.id; b.title = g.name;
  });
  COLORS.forEach(([id, bg]) => { const b = chip($('colors'), '', '', () => { state.color = id; emit(); }); b.dataset.id = id; b.title = id; b.style.background = bg; });
  Object.entries(SIZES).forEach(([id, s]) => { const b = chip($('sizes'), '', s.name, () => { state.size = id; emit(); }); b.dataset.id = id; });
}

function syncControls() {
  const mark = (box, key) => box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === state[key]));
  mark($('layouts'), 'layout'); mark($('grades'), 'grade'); mark($('colors'), 'color'); mark($('sizes'), 'size');
  $('panelNo').textContent = `${state.sel + 1} of ${rects.length}`;
  const p = state.panels[state.sel];
  if (p) $('zoom').value = p.zoom;
  for (const [id, key] of [['title', 'title'], ['sub', 'sub'], ['pos', 'pos']]) if ($(id).value !== state[key] && document.activeElement !== $(id)) $(id).value = state[key];
}

function canvasPoint(e) {
  const b = canvas.getBoundingClientRect();
  return [(e.clientX - b.left) * canvas.width / b.width, (e.clientY - b.top) * canvas.height / b.height];
}

function wirePanelGestures() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = canvasPoint(e), i = hitPanel(rects, x, y);
    if (i < 0) return;
    state.sel = i; drag = { i, x, y }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); emit();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [x, y] = canvasPoint(e), r = rects[drag.i], p = state.panels[drag.i];
    if (p.img) {
      const dx = x - drag.x, dy = y - drag.y, c = Math.cos(-r.rot), s = Math.sin(-r.rot);
      const lx = dx * c - dy * s, ly = dx * s + dy * c, { ovx, ovy } = overflow(p, r);
      if (ovx > 0) p.ox = Math.max(-1, Math.min(1, p.ox + 2 * lx / ovx));
      if (ovy > 0) p.oy = Math.max(-1, Math.min(1, p.oy + 2 * ly / ovy));
    }
    drag.x = x; drag.y = y; schedule();
  });
  const end = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = canvasPoint(e), hit = hitPanel(rects, x, y), i = hit < 0 ? state.sel : hit;
    state.sel = i; const p = state.panels[i];
    p.zoom = Math.max(1, Math.min(4, p.zoom * Math.exp(-e.deltaY * 0.0015))); schedule();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => $('file').click());
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const [x, y] = canvasPoint(e), i = hitPanel(rects, x, y), f = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (f) { const k = i < 0 ? state.sel : i; state.sel = k; setPhoto(k, await loadImageFile(f)); emit(); }
  });
}

function wireControls() {
  $('title').oninput = (e) => { state.title = e.target.value; schedule(); };
  $('sub').oninput = (e) => { state.sub = e.target.value; schedule(); };
  $('pos').onchange = (e) => { state.pos = e.target.value; schedule(); };
  $('zoom').oninput = (e) => { state.panels[state.sel].zoom = Number(e.target.value); schedule(); };
  $('resetCrop').onclick = () => { resetCrop(state.sel); emit(); };
  $('sampleBoulevard').onclick = () => { setPhoto(state.sel, samples.boulevard); emit(); };
  $('samplePier').onclick = () => { setPhoto(state.sel, samples.pier); emit(); };
  $('useAll').onclick = () => {
    const img = state.panels[state.sel].img;
    if (img) { setAllPhotos(img); emit(); }
  };
  $('file').onchange = async (e) => {
    const files = [...e.target.files];
    for (let k = 0; k < files.length; k++) {
      const slot = (state.sel + k) % Math.max(1, rects.length);
      setPhoto(slot, await loadImageFile(files[k]), CROPS[0]);
    }
    e.target.value = ''; emit();
  };
  $('exportBtn').onclick = () => exportPng(state);
  wirePanelGestures();
}

async function boot() {
  const query = new URLSearchParams(location.search), shot = query.get('shot');
  buildControls(); wireControls(); onChange(schedule);
  [samples.pier, samples.boulevard] = await Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')]);
  state.panels.forEach((_, i) => setPhoto(i, i % 3 === 1 ? samples.boulevard : samples.pier, CROPS[i]));
  await document.fonts.load('100px Anton');
  if (shot) await runShot(shot, query); else emit();
  paint();
}
boot();
