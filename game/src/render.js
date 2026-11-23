// render.js — everything Crown & Dagger draws, on one 1280x800 canvas.
//
// The table is a tavern felt: deep green under a burgundy-and-gold frame.
// The rival sits at the top behind a fan of card backs, portrait in a gold
// oval, intent plaque above their head. The player's hand fans across the
// bottom over their health bar and energy gems. Cards are parchment with a
// coloured band, a cost gem and a hand-drawn icon, so a card's job reads by
// colour and shape at thumbnail size, never by text alone.
//
// render.js owns no game rules. It reads the campaign, draws it, and writes
// the clickable rectangles into `layout` for main.js to hit-test.

import { CARD_TYPES } from './cards.js';
import { RIVALS, intentLabel } from './rival.js';
import { PLAYER_MAX_HP } from './duel.js';

export const W = 1280;
export const H = 800;

// Clickable rectangles, refreshed by every draw.
export const layout = {
  cardRects: [],   // one { x, y, w, h } per card in hand, in hand order
  endTurn: null,   // the END TURN button during a duel
  primary: null,   // the advance/retry click target on menu screens
};

// Transient view state owned by main.js: hover, floaters, card flight.
export function newView() {
  return { hover: -1, floaters: [], flight: null, shakeUntil: 0 };
}

const GOLD = '#d9a441';
const GOLD_DARK = '#9a741f';
const PARCH = '#f3e6c8';
const INK = '#2a1f14';

// ---------------------------------------------------------------- helpers

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, align = 'center', weight = 700, font = 'Georgia, serif') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, x, y, maxW, size, colour, lineH) {
  ctx.font = `600 ${size}px Georgia, serif`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const trial = line ? line + ' ' + w : w;
    if (ctx.measureText(trial).width > maxW && line) { lines.push(line); line = w; }
    else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineH, size, colour, 'center', 600));
  return lines.length;
}

// ------------------------------------------------------------ card icons
// Each icon is drawn from paths in a 100x100 box centred on (x, y).

export function drawIcon(ctx, kind, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'sword':
      ctx.moveTo(-28, 30); ctx.lineTo(24, -22);          // blade edge
      ctx.moveTo(24, -22); ctx.lineTo(30, -30); ctx.lineTo(22, -14); // tip
      ctx.moveTo(-12, 12); ctx.lineTo(8, 32);            // crossguard
      ctx.moveTo(-24, 24); ctx.lineTo(-34, 34);          // pommel grip
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-36, 36, 6, 0, Math.PI * 2); ctx.fill();
      break;
    case 'shield':
      ctx.moveTo(0, -36);
      ctx.quadraticCurveTo(26, -30, 30, -28);
      ctx.quadraticCurveTo(30, 8, 0, 38);
      ctx.quadraticCurveTo(-30, 8, -30, -28);
      ctx.quadraticCurveTo(-26, -30, 0, -36);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke();
      break;
    case 'flask':
      ctx.moveTo(-8, -36); ctx.lineTo(8, -36);           // lip
      ctx.moveTo(0, -36); ctx.lineTo(0, -14);
      ctx.moveTo(0, -14); ctx.quadraticCurveTo(26, 4, 26, 16);
      ctx.quadraticCurveTo(26, 36, 0, 36);
      ctx.quadraticCurveTo(-26, 36, -26, 16);
      ctx.quadraticCurveTo(-26, 4, 0, -14);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-10, 18, 5, 0, Math.PI * 2); ctx.arc(8, 26, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case 'goblet':
      ctx.moveTo(-26, -30); ctx.lineTo(26, -30);
      ctx.quadraticCurveTo(26, 2, 0, 4);
      ctx.quadraticCurveTo(-26, 2, -26, -30);
      ctx.moveTo(0, 4); ctx.lineTo(0, 28);
      ctx.moveTo(-16, 34); ctx.lineTo(16, 34);
      ctx.stroke();
      break;
    case 'mirror':
      ctx.ellipse(0, -8, 24, 30, 0, 0, Math.PI * 2);
      ctx.moveTo(0, 22); ctx.lineTo(0, 38);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(4, 8); ctx.stroke();
      break;
    case 'dice':
      rr(ctx, -30, -30, 60, 60, 12); ctx.stroke();
      ctx.beginPath();
      for (const [dx, dy] of [[-15, -15], [15, -15], [0, 0], [-15, 15], [15, 15]]) {
        ctx.moveTo(dx + 6, dy); ctx.arc(dx, dy, 6, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 'net':
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * 14, -32); ctx.lineTo(i * 14 + 8, 32);
        ctx.moveTo(-32, i * 14); ctx.lineTo(32, i * 14 + 8);
      }
      ctx.stroke();
      break;
    case 'crown':
      ctx.moveTo(-32, 22); ctx.lineTo(-32, -14); ctx.lineTo(-14, 6);
      ctx.lineTo(0, -24); ctx.lineTo(14, 6); ctx.lineTo(32, -14); ctx.lineTo(32, 22);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -30, 5, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- table

function drawTable(ctx) {
  const g = ctx.createRadialGradient(640, 400, 120, 640, 400, 760);
  g.addColorStop(0, '#256b45');
  g.addColorStop(0.6, '#17492e');
  g.addColorStop(1, '#0b2a1a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // burgundy wood frame with a gold pinstripe
  ctx.strokeStyle = '#4a1622';
  ctx.lineWidth = 26;
  ctx.strokeRect(13, 13, W - 26, H - 26);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  // faint filigree rings on the felt
  ctx.strokeStyle = 'rgba(217,164,65,0.13)';
  ctx.lineWidth = 2;
  for (const r of [150, 210]) {
    ctx.beginPath(); ctx.arc(640, 400, r, 0, Math.PI * 2); ctx.stroke();
  }
}

// -------------------------------------------------------------- portrait

export function drawPortrait(ctx, rival, cx, cy, scale = 1) {
  const p = rival.portrait;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // shoulders / cloth
  ctx.fillStyle = p.cloth;
  ctx.beginPath();
  ctx.moveTo(-52, 62);
  ctx.quadraticCurveTo(-50, 18, -18, 12);
  ctx.lineTo(18, 12);
  ctx.quadraticCurveTo(50, 18, 52, 62);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = p.trim; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-18, 12); ctx.lineTo(0, 34); ctx.lineTo(18, 12); ctx.stroke();
  // face
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.ellipse(0, -12, 30, 36, 0, 0, Math.PI * 2); ctx.fill();
  // hair / headwear
  ctx.fillStyle = p.hair;
  if (p.style === 'cap') {
    ctx.beginPath(); ctx.ellipse(0, -34, 31, 14, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(-38, -36, 76, 7);
  } else if (p.style === 'circlet') {
    ctx.beginPath(); ctx.ellipse(-31, -6, 9, 30, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(31, -6, 9, 30, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -38, 30, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.trim; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, -30, 30, 10, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  } else { // crown
    ctx.beginPath(); ctx.ellipse(0, -40, 30, 11, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(-30, -34); ctx.lineTo(-30, -56); ctx.lineTo(-15, -42);
    ctx.lineTo(0, -60); ctx.lineTo(15, -42); ctx.lineTo(30, -56); ctx.lineTo(30, -34);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8402f';
    ctx.beginPath(); ctx.arc(0, -40, 5, 0, Math.PI * 2); ctx.fill();
  }
  // eyes and mouth
  ctx.fillStyle = '#241a12';
  ctx.beginPath(); ctx.arc(-11, -14, 3.2, 0, Math.PI * 2); ctx.arc(11, -14, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 6, 9, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
  // gold oval frame
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(scale, scale);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 58, 66, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 63, 71, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------- hp / badges

function hpBar(ctx, x, y, w, hp, max, label, name) {
  text(ctx, name, x, y - 16, 17, PARCH, 'left', 700);
  rr(ctx, x, y, w, 20, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
  const frac = Math.max(0, hp / max);
  if (frac > 0) {
    const g = ctx.createLinearGradient(x, y, x, y + 20);
    g.addColorStop(0, frac > 0.3 ? '#d95f4b' : '#ff7a5c');
    g.addColorStop(1, frac > 0.3 ? '#a02c1c' : '#c23a1e');
    rr(ctx, x + 2, y + 2, (w - 4) * frac, 16, 8);
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, x, y, w, 20, 10); ctx.stroke();
  text(ctx, `${Math.max(0, hp)} / ${max}`, x + w / 2, y + 10, 15, '#fff', 'center', 800);
  if (label) text(ctx, label, x, y + 34, 13, '#e8d9ae', 'left', 600);
}

function badge(ctx, x, y, iconKind, str, colour) {
  rr(ctx, x, y, 108, 30, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
  ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.stroke();
  drawIcon(ctx, iconKind, x + 18, y + 15, 20, colour);
  text(ctx, str, x + 34, y + 15, 14, '#fff', 'left', 700);
}

// ----------------------------------------------------------------- cards

const CARD_W = 168;
const CARD_H = 238;

export function drawCard(ctx, id, x, y, rot, opts = {}) {
  const c = CARD_TYPES[id];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (opts.dim) ctx.globalAlpha = 0.45;
  // shadow + body
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, -CARD_W / 2 + 5, -CARD_H / 2 + 8, CARD_W, CARD_H, 14); ctx.fill();
  const g = ctx.createLinearGradient(0, -CARD_H / 2, 0, CARD_H / 2);
  g.addColorStop(0, '#f8eed2'); g.addColorStop(1, '#e9d5a8');
  rr(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 3; ctx.stroke();
  // band
  ctx.save();
  rr(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14); ctx.clip();
  const bg = ctx.createLinearGradient(0, -CARD_H / 2, 0, -CARD_H / 2 + 52);
  bg.addColorStop(0, c.band); bg.addColorStop(1, c.bandDark);
  ctx.fillStyle = bg;
  ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 52);
  ctx.fillStyle = 'rgba(217,164,65,0.9)';
  ctx.fillRect(-CARD_W / 2, -CARD_H / 2 + 52, CARD_W, 3);
  ctx.restore();
  text(ctx, c.name.toUpperCase(), 0, -CARD_H / 2 + 27, c.name.length > 9 ? 16 : 19, '#fff', 'center', 800);
  // cost gem
  ctx.beginPath(); ctx.arc(-CARD_W / 2 + 24, -CARD_H / 2 + 26, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#f7c948'; ctx.fill();
  ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, String(c.cost), -CARD_W / 2 + 24, -CARD_H / 2 + 27, 19, '#5f470f', 'center', 900);
  // icon medallion
  ctx.beginPath(); ctx.arc(0, -18, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8e6'; ctx.fill();
  ctx.strokeStyle = c.band; ctx.lineWidth = 3; ctx.stroke();
  drawIcon(ctx, c.icon, 0, -18, 56, c.bandDark);
  // rules text
  wrapText(ctx, c.text, 0, 44, CARD_W - 24, 14.5, INK, 18);
  // key hint
  if (opts.key) {
    ctx.beginPath(); ctx.arc(CARD_W / 2 - 20, CARD_H / 2 - 20, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(42,31,20,0.85)'; ctx.fill();
    text(ctx, opts.key, CARD_W / 2 - 20, CARD_H / 2 - 19, 14, PARCH, 'center', 800);
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  rr(ctx, -46, -66, 92, 132, 9);
  const g = ctx.createLinearGradient(0, -66, 0, 66);
  g.addColorStop(0, '#5c1a2a'); g.addColorStop(1, '#38101b');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  rr(ctx, -36, -56, 72, 112, 6);
  ctx.strokeStyle = 'rgba(217,164,65,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  drawIcon(ctx, 'crown', 0, -8, 40, GOLD);
  drawIcon(ctx, 'sword', 0, 30, 30, 'rgba(217,164,65,0.8)');
  ctx.restore();
}

// ---------------------------------------------------------------- screens

function drawDuel(ctx, campaign, view, now) {
  const duel = campaign.duel;
  const rival = duel.rival;
  layout.cardRects = [];
  layout.endTurn = null;
  layout.primary = null;

  // top strip: duel progress + score
  text(ctx, `DUEL ${duel.index + 1} OF 3`, 64, 58, 17, GOLD, 'left', 800);
  text(ctx, `SCORE ${campaign.totalScore + (campaign.duelScores[duel.index] ? 0 : 0)}`, W - 64, 58, 19, GOLD, 'right', 800);
  text(ctx, `Turn ${duel.turn}`, 640, 58, 15, '#cfe3d2', 'center', 600);

  // rival card backs
  for (let i = 0; i < 5; i++) {
    const bx = 640 + (i - 2) * 62;
    drawCardBack(ctx, bx, 96, (i - 2) * 0.06);
  }

  // intent plaque above the portrait
  const label = intentLabel(duel.intent);
  ctx.font = '800 19px Georgia, serif';
  const tw = ctx.measureText(label).width + 92;
  const px = 640 - tw / 2, py = 118;
  rr(ctx, px, py, tw, 44, 12);
  ctx.fillStyle = duel.intent.heavy ? '#5c1a14' : '#f3e6c8';
  ctx.fill();
  ctx.strokeStyle = duel.intent.heavy ? '#ff7a5c' : GOLD_DARK; ctx.lineWidth = 2.5; ctx.stroke();
  drawIcon(ctx, duel.intent.kind === 'strike' ? 'sword' : duel.intent.kind === 'venom' ? 'flask' : duel.intent.kind === 'guard' ? 'shield' : 'goblet',
    px + 26, py + 22, 26, duel.intent.heavy ? '#ffb59f' : '#7e2418');
  text(ctx, label, px + 48, py + 22, 19, duel.intent.heavy ? '#ffe9e2' : INK, 'left', 800);
  if (duel.intent.snared) text(ctx, 'SNARED', px + tw - 12, py + 22, 13, '#6b4fa1', 'right', 900);

  // portrait + name + health
  drawPortrait(ctx, rival, 640, 226, 0.92);
  text(ctx, `${rival.name} — ${rival.title}`, 640, 316, 21, PARCH, 'center', 800);
  hpBar(ctx, 470, 336, 340, duel.rivalHp, rival.maxHp, '', '');
  let bx = 830;
  if (duel.rivalBlock > 0) { badge(ctx, bx, 330, 'shield', `${duel.rivalBlock}`, '#7fb2e0'); bx += 116; }
  if (duel.rivalVenom) { badge(ctx, bx, 330, 'flask', `${duel.rivalVenom.per}×${duel.rivalVenom.turns}`, '#8fd07a'); bx += 116; }
  text(ctx, `“${rival.taunt}”`, 640, 386, 15, '#cfe3d2', 'center', 600, 'italic');

  // centre log
  const log = duel.log.slice(-2);
  log.forEach((line, i) => text(ctx, line, 640, 424 + i * 22, 15.5, i === log.length - 1 ? '#ffeec4' : 'rgba(232,217,174,0.6)', 'center', 600));

  // player status row
  hpBar(ctx, 64, 452, 300, duel.playerHp, PLAYER_MAX_HP, '', 'YOU');
  let pxb = 380;
  if (duel.playerBlock > 0) { badge(ctx, pxb, 486, 'shield', `${duel.playerBlock}`, '#7fb2e0'); pxb += 116; }
  if (duel.playerVenom) { badge(ctx, pxb, 486, 'flask', `${duel.playerVenom.per}×${duel.playerVenom.turns}`, '#8fd07a'); pxb += 116; }
  if (duel.mirrorUp) { badge(ctx, pxb, 486, 'mirror', 'UP', '#c9ccd6'); pxb += 116; }

  // energy gems
  text(ctx, 'ENERGY', 1064, 446, 13, '#e8d9ae', 'left', 700);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(1082 + i * 36, 472, 13, 0, Math.PI * 2);
    ctx.fillStyle = i < duel.energy ? '#f7c948' : 'rgba(247,201,72,0.18)';
    ctx.fill();
    ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 2; ctx.stroke();
  }
  text(ctx, `Deck ${duel.deck.length} · Discard ${duel.discard.length}`, 1216, 500, 13, '#cfe3d2', 'right', 600);

  // the hand, fanned
  const n = duel.hand.length;
  const spread = Math.min(150, 760 / Math.max(1, n));
  const cx0 = 640 - ((n - 1) * spread) / 2;
  for (let i = 0; i < n; i++) {
    const id = duel.hand[i];
    const rot = (i - (n - 1) / 2) * 0.045;
    const hovered = view.hover === i;
    const cx = cx0 + i * spread;
    const cy = 668 + Math.abs(i - (n - 1) / 2) * 7 - (hovered ? 30 : 0);
    drawCard(ctx, id, cx, cy, rot, { key: String(i + 1), dim: CARD_TYPES[id].cost > duel.energy });
    layout.cardRects.push({ x: cx - CARD_W / 2, y: cy - CARD_H / 2, w: CARD_W, h: CARD_H });
  }

  // END TURN button
  const bxr = { x: 1052, y: 560, w: 164, h: 64 };
  rr(ctx, bxr.x, bxr.y, bxr.w, bxr.h, 14);
  const bg2 = ctx.createLinearGradient(0, bxr.y, 0, bxr.y + bxr.h);
  bg2.addColorStop(0, '#7e2438'); bg2.addColorStop(1, '#4a1622');
  ctx.fillStyle = bg2; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, 'END TURN', bxr.x + bxr.w / 2, bxr.y + 26, 20, '#ffeec4', 'center', 900);
  text(ctx, 'space', bxr.x + bxr.w / 2, bxr.y + 48, 12, '#e8d9ae', 'center', 600);
  layout.endTurn = bxr;

  // the flight of the just-played card
  if (view.flight) {
    const t = Math.min(1, (now - view.flight.born) / 380);
    const fx = view.flight.x + (640 - view.flight.x) * t;
    const fy = view.flight.y + (430 - view.flight.y) * t;
    ctx.globalAlpha = 1 - t * t;
    drawCard(ctx, view.flight.id, fx, fy, 0, {});
    ctx.globalAlpha = 1;
    if (t >= 1) view.flight = null;
  }
}

function drawFloaters(ctx, view, now) {
  view.floaters = view.floaters.filter(f => now - f.born < 1000);
  for (const f of view.floaters) {
    const t = (now - f.born) / 1000;
    const x = f.side === 'rival' ? 760 : 300;
    const y = (f.side === 'rival' ? 250 : 470) - t * 56;
    const colours = { damage: '#ff8a70', heal: '#8fe388', block: '#a9cdf0', venom: '#a4e68a', mirror: '#e8ecf2', snare: '#c4aef0', play: '#ffeec4', win: GOLD, lose: '#ff8a70' };
    ctx.globalAlpha = 1 - t;
    text(ctx, f.text, x, y, f.text.length > 6 ? 22 : 30, colours[f.tone] || '#fff', 'center', 900);
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, w, h) {
  rr(ctx, 640 - w / 2, 400 - h / 2, w, h, 20);
  ctx.fillStyle = 'rgba(16,26,18,0.92)'; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
}

function drawTitle(ctx, campaign, view, now) {
  layout.cardRects = []; layout.endTurn = null;
  text(ctx, 'CROWN & DAGGER', 640, 128, 74, GOLD, 'center', 900);
  text(ctx, 'a duel of cards', 640, 182, 26, PARCH, 'center', 600, 'italic');
  drawIcon(ctx, 'crown', 640, 248, 64, GOLD);
  text(ctx, 'Three rivals hold the tavern table. Read their intent. Answer it. Take the crown.', 640, 306, 19, '#e8d9ae', 'center', 600);
  RIVALS.forEach((r, i) => {
    const cx = 340 + i * 300;
    drawPortrait(ctx, r, cx, 420, 1.05);
    text(ctx, r.name, cx, 516, 22, PARCH, 'center', 800);
    text(ctx, r.title, cx, 542, 16, GOLD, 'center', 600, 'italic');
  });
  rr(ctx, 490, 596, 300, 62, 14);
  ctx.fillStyle = '#7e2438'; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, 'BEGIN THE FIRST DUEL', 640, 627, 19, '#ffeec4', 'center', 900);
  layout.primary = { x: 490, y: 596, w: 300, h: 62 };
  text(ctx, 'Click a card or press 1–5 to play it · Space ends your turn · 3 Energy a turn, draw to 5', 640, 706, 15.5, '#cfe3d2', 'center', 600);
  text(ctx, 'Strike · Guard · Venom · Feast · Mirror · Gambit · Snare · Royal Decree', 640, 734, 15.5, '#cfe3d2', 'center', 600);
}

function summaryRows(ctx, campaign, y0) {
  let y = y0;
  const rows = [
    ['Turns taken', String(campaign.lastSummary.turns)],
    ['Health kept', `+${campaign.lastSummary.healthKept}`],
    ['Speed bonus', `+${campaign.lastSummary.speedBonus}`],
  ];
  if (campaign.lastSummary.styleBonus > 0) rows.push(['Style — a mirrored / gambit kill', `+${campaign.lastSummary.styleBonus}`]);
  rows.push(['Duel score', String(campaign.lastSummary.total)]);
  rows.push(['Campaign score', String(campaign.totalScore)]);
  for (const [k, v] of rows) {
    text(ctx, k, 470, y, 19, '#e8d9ae', 'left', 600);
    text(ctx, v, 810, y, 19, GOLD, 'right', 800);
    y += 34;
  }
  return y;
}

function drawDuelWon(ctx, campaign, view, now) {
  layout.cardRects = []; layout.endTurn = null;
  panel(ctx, 560, 470);
  drawIcon(ctx, 'crown', 640, 218, 58, GOLD);
  text(ctx, 'DUEL WON', 640, 276, 40, GOLD, 'center', 900);
  text(ctx, `${campaign.lastSummary.rivalName}, ${campaign.lastSummary.rivalTitle}, yields the chair.`, 640, 316, 17, PARCH, 'center', 600, 'italic');
  summaryRows(ctx, campaign, 366);
  rr(ctx, 490, 520, 300, 58, 14);
  ctx.fillStyle = '#7e2438'; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, `FACE ${RIVALS[campaign.duelIndex + 1].name.toUpperCase()}`, 640, 549, 18, '#ffeec4', 'center', 900);
  layout.primary = { x: 490, y: 520, w: 300, h: 58 };
}

function drawCampaignWon(ctx, campaign, view, now) {
  layout.cardRects = []; layout.endTurn = null; layout.primary = null;
  panel(ctx, 620, 540);
  drawIcon(ctx, 'crown', 640, 196, 84, GOLD);
  text(ctx, 'THE CROWN IS YOURS', 640, 268, 42, GOLD, 'center', 900);
  text(ctx, 'All three rivals are beaten. The table, and the crown, change hands.', 640, 306, 17, PARCH, 'center', 600, 'italic');
  let y = 356;
  campaign.duelScores.forEach((s, i) => {
    text(ctx, `${RIVALS[i].name}, ${RIVALS[i].title}`, 420, y, 18, '#e8d9ae', 'left', 600);
    text(ctx, String(s.total), 860, y, 18, PARCH, 'right', 700);
    y += 32;
  });
  text(ctx, 'FINAL SCORE', 420, y + 14, 21, GOLD, 'left', 900);
  text(ctx, String(campaign.totalScore), 860, y + 14, 26, GOLD, 'right', 900);
  text(ctx, 'Click anywhere to play again', 640, 620, 15, '#cfe3d2', 'center', 600);
  layout.primary = { x: 330, y: 130, w: 620, h: 540 };
}

function drawLost(ctx, campaign, view, now) {
  layout.cardRects = []; layout.endTurn = null;
  const duel = campaign.duel;
  ctx.fillStyle = 'rgba(40,4,8,0.45)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 560, 420);
  drawPortrait(ctx, duel.rival, 640, 268, 1.0);
  text(ctx, 'DRIVEN FROM THE TABLE', 640, 386, 34, '#ff8a70', 'center', 900);
  text(ctx, `${duel.rival.name} takes the duel on turn ${duel.turn}.`, 640, 424, 17, PARCH, 'center', 600);
  text(ctx, `“${duel.rival.taunt}”`, 640, 452, 16, '#e8d9ae', 'center', 600, 'italic');
  rr(ctx, 490, 486, 300, 58, 14);
  ctx.fillStyle = '#7e2438'; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, 'DUEL AGAIN', 640, 515, 19, '#ffeec4', 'center', 900);
  layout.primary = { x: 490, y: 486, w: 300, h: 58 };
}

export function draw(ctx, campaign, view, now) {
  ctx.clearRect(0, 0, W, H);
  drawTable(ctx);
  if (now < view.shakeUntil) {
    const dx = (Math.random() - 0.5) * 10;
    const dy = (Math.random() - 0.5) * 8;
    ctx.save(); ctx.translate(dx, dy);
  }
  switch (campaign.screen) {
    case 'title': drawTitle(ctx, campaign, view, now); break;
    case 'duel': drawDuel(ctx, campaign, view, now); break;
    case 'duelWon': drawDuelWon(ctx, campaign, view, now); break;
    case 'campaignWon': drawCampaignWon(ctx, campaign, view, now); break;
    case 'lost': drawLost(ctx, campaign, view, now); break;
  }
  if (now < view.shakeUntil) ctx.restore();
  if (campaign.screen === 'duel') drawFloaters(ctx, view, now);
}
