// Canvas compositing for preview and export: backdrop, panels (crop/zoom + grade), dividers, caption.
import { panelRects, layoutById } from './layouts.js';
import { gradeById, paintGrade } from './grades.js';

const TINTS = ['#ff4fa0', '#ffa23d', '#3be0ff', '#a24bff', '#ff6a3d', '#4fffb0', '#ff4fd8', '#ffd24f', '#6a7bff'];
const PAPER = '#f3ecdf';

// How far the photo overflows the panel at the current zoom (the room available for panning).
export function overflow(p, r) {
  const iw = p.img.naturalWidth || p.img.width, ih = p.img.naturalHeight || p.img.height;
  const s = Math.max(r.w / iw, r.h / ih) * p.zoom;
  return { dw: iw * s, dh: ih * s, ovx: Math.max(0, iw * s - r.w), ovy: Math.max(0, ih * s - r.h) };
}

// Convert a drag delta in panel-local pixels into offset changes. The photo is mirrored when flipped,
// so horizontal drags must be inverted for the image to follow the pointer.
export function panDelta(p, r, lx, ly) {
  const { ovx, ovy } = overflow(p, r);
  return { dox: ovx > 0 ? (p.flip ? -2 : 2) * lx / ovx : 0, doy: ovy > 0 ? 2 * ly / ovy : 0 };
}

function drawPhoto(ctx, p, r, i) {
  if (!p.img) {
    ctx.fillStyle = '#2a1048'; ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.fillStyle = '#ff9acb'; ctx.font = `${r.h * 0.3}px Anton, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, 0); return;
  }
  const { dw, dh, ovx, ovy } = overflow(p, r);
  if (p.flip) ctx.scale(-1, 1); // mirror around the panel centre
  ctx.drawImage(p.img, p.ox * ovx / 2 - dw / 2, p.oy * ovy / 2 - dh / 2, dw, dh);
}

function drawPanel(ctx, state, r, i, scale, selected) {
  const grade = gradeById(state.grade), p = state.panels[i];
  ctx.save();
  ctx.translate(r.cx, r.cy); ctx.rotate(r.rot);
  if (r.frame) {
    const { pad, bottom } = r.frame;
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = scale * 28; ctx.shadowOffsetY = scale * 10;
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + 2 * pad, r.h + pad + bottom);
    ctx.shadowColor = 'transparent';
  }
  ctx.beginPath(); ctx.rect(-r.w / 2, -r.h / 2, r.w, r.h); ctx.clip();
  ctx.filter = grade.filter;
  drawPhoto(ctx, p, r, i);
  ctx.filter = 'none';
  paintGrade(ctx, grade, r.w, r.h);
  // slight panel colour variation, the poster's hand-tinted look
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.16; ctx.fillStyle = TINTS[i % TINTS.length];
  ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.restore();
  if (selected) {
    ctx.save(); ctx.translate(r.cx, r.cy); ctx.rotate(r.rot);
    ctx.lineWidth = Math.max(3, scale * 6); ctx.strokeStyle = '#2fe6f0'; ctx.shadowColor = '#2fe6f0'; ctx.shadowBlur = scale * 14;
    ctx.strokeRect(-r.w / 2 + ctx.lineWidth / 2, -r.h / 2 + ctx.lineWidth / 2, r.w - ctx.lineWidth, r.h - ctx.lineWidth);
    ctx.restore();
  }
}

function drawBackdrop(ctx, layout, W, H) {
  if (layout.dark) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a0638'); g.addColorStop(0.6, '#4a1362'); g.addColorStop(1, '#ff5f6d');
    ctx.fillStyle = g;
  } else ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
}

function setLetterFill(ctx, style, x, top, bottom, size) {
  if (style === 'sunset') {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#fff07a'); g.addColorStop(0.35, '#ffa23d'); g.addColorStop(0.7, '#ff3d8b'); g.addColorStop(1, '#a53cff');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(40,0,50,.6)'; ctx.shadowBlur = size * 0.1; ctx.shadowOffsetY = size * 0.04;
  } else if (style === 'neon') {
    ctx.fillStyle = '#ff5ee0'; ctx.shadowColor = '#ff1fc4'; ctx.shadowBlur = size * 0.35; ctx.shadowOffsetY = 0;
  } else {
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(20,0,40,.7)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.04;
  }
}

function drawLetters(ctx, text, x, y, style, size, top, outline = 0) {
  // outline = stroke width as a fraction of the font size (0 = off)
  setLetterFill(ctx, style, x, top, y, size);
  if (outline > 0) { // dark stroke under the fill so letters stay crisp on busy photos
    ctx.save(); ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = size * outline; ctx.strokeStyle = '#12041f';
    ctx.strokeText(text, x, y); ctx.restore();
  }
  ctx.fillText(text, x, y);
  if (style === 'neon') { ctx.fillText(text, x, y); ctx.shadowBlur = 0; ctx.fillStyle = '#ffd6f6'; ctx.globalAlpha = 0.55; ctx.fillText(text, x, y); ctx.globalAlpha = 1; }
  ctx.shadowColor = 'transparent';
}

// Caption: scrim for legibility, big display title, smaller spaced subtitle.
export function drawCaption(ctx, state, W, H) {
  const title = state.title.trim().toUpperCase(), sub = state.sub.trim().toUpperCase();
  if (!title && !sub) return;
  const base = Math.min(W, H * 1.5);
  const fam = 'Anton, Impact, "Arial Narrow Bold", sans-serif';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  let fs = base * 0.2;
  const track = (state.tracking ?? 2) / 100;
  ctx.font = `${fs}px ${fam}`; ctx.letterSpacing = `${fs * track}px`;
  const maxW = W * 0.88, tw = title ? ctx.measureText(title).width : 0;
  if (tw > maxW) { fs *= maxW / tw; ctx.font = `${fs}px ${fam}`; ctx.letterSpacing = `${fs * track}px`; }
  const sfs = Math.min(base * 0.058, fs * 0.34);
  const blockH = (title ? fs * 0.86 : 0) + (sub ? sfs * 1.9 : 0), m = base * 0.075;
  let top = state.pos === 'top' ? m : state.pos === 'center' ? (H - blockH) / 2 : H - m - blockH;
  const scrimH = blockH + base * 0.3;
  let sy = state.pos === 'top' ? 0 : state.pos === 'center' ? top - base * 0.15 : H - scrimH;
  const g = ctx.createLinearGradient(0, sy, 0, sy + scrimH);
  if (state.pos === 'center') { g.addColorStop(0, 'rgba(12,2,28,0)'); g.addColorStop(0.5, 'rgba(12,2,28,.62)'); g.addColorStop(1, 'rgba(12,2,28,0)'); }
  else if (state.pos === 'top') { g.addColorStop(0, 'rgba(12,2,28,.78)'); g.addColorStop(1, 'rgba(12,2,28,0)'); }
  else { g.addColorStop(0, 'rgba(12,2,28,0)'); g.addColorStop(1, 'rgba(12,2,28,.8)'); }
  ctx.fillStyle = g; ctx.fillRect(0, sy, W, scrimH);
  let y = top;
  if (title) {
    y += fs * 0.86 - fs * 0.04;
    ctx.font = `${fs}px ${fam}`; ctx.letterSpacing = `${fs * track}px`;
    drawLetters(ctx, title, W / 2, y, state.color, fs, y - fs * 0.8, state.outline ? 0.07 : 0);
    y += fs * 0.04;
  }
  if (sub) {
    y += sfs * 1.5;
    ctx.font = `${sfs}px ${fam}`; ctx.letterSpacing = `${sfs * 0.28}px`;
    drawLetters(ctx, sub, W / 2, y, state.color === 'sunset' ? 'white' : state.color, sfs, y - sfs, state.outline ? 0.12 : 0);
  }
  ctx.restore();
}

// Draw the whole cover. opts.preview adds the selected-panel highlight (never on export).
export function renderCover(canvas, state, W, H, opts = {}) {
  canvas.width = Math.round(W); canvas.height = Math.round(H);
  const ctx = canvas.getContext('2d');
  const layout = layoutById(state.layout), rects = panelRects(layout.id, W, H), scale = Math.min(W, H) / 1080;
  drawBackdrop(ctx, layout, W, H);
  rects.forEach((r, i) => drawPanel(ctx, state, r, i, scale, false));
  drawCaption(ctx, state, W, H);
  if (opts.preview && state.sel < rects.length) {
    const r = rects[state.sel]; drawPanel(ctx, state, r, state.sel, scale, true);
    drawCaption(ctx, state, W, H);
  }
  return rects;
}
