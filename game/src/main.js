// main.js — Crown & Dagger's entry point: input, the frame loop, and the
// wiring between duel.js (rules), render.js (drawing) and audio.js (sound).
//
// Input is mouse-first: cards are clicked where render.js last drew them
// (its `layout`), the END TURN button likewise, and menu screens advance on
// their primary button. Keys mirror the mouse: 1–5 play a card, Space ends
// the turn or advances a screen.
//
// Screenshot hook: open the page with ?shot=cover|tense|king|win to stage a
// composed scene for the maker's screenshots, or ?duel=0|1|2 to open a duel
// directly. Real play never passes these.

import { newCampaign, startDuel, playCard, endTurn } from './duel.js';
import { draw, layout, newView, W, H } from './render.js';
import { unlockAudio, playSfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let campaign = newCampaign();
const view = newView();

function nowSeed() {
  return (Date.now() ^ (Math.random() * 0xffffff)) >>> 0;
}

// ------------------------------------------------------------- fx plumbing

function drainFx() {
  const duel = campaign.duel;
  if (!duel) return;
  const now = performance.now();
  for (const ev of duel.fx) {
    if (ev.sfx) playSfx(ev.sfx);
    if (ev.text) view.floaters.push({ side: ev.side, text: ev.text, tone: ev.tone, born: now });
    if (ev.sfx === 'hit' && ev.side === 'player') view.shakeUntil = now + 260;
  }
  duel.fx.length = 0;
}

// ----------------------------------------------------------------- actions

function advanceScreen() {
  if (campaign.screen === 'title') {
    startDuel(campaign, 0, nowSeed());
  } else if (campaign.screen === 'duelWon') {
    startDuel(campaign, campaign.duelIndex + 1, nowSeed());
  } else if (campaign.screen === 'lost') {
    startDuel(campaign, campaign.duelIndex, nowSeed());
  } else if (campaign.screen === 'campaignWon') {
    campaign = newCampaign();
  }
  drainFx();
}

function tryPlay(i) {
  const duel = campaign.duel;
  if (!duel || campaign.screen !== 'duel') return;
  const rect = layout.cardRects[i];
  const id = duel.hand[i];
  if (playCard(campaign, i)) {
    if (rect) view.flight = { id, x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, born: performance.now() };
  }
  drainFx();
}

function tryEndTurn() {
  endTurn(campaign);
  drainFx();
}

// ------------------------------------------------------------------- input

function toGameCoords(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left) * (W / r.width),
    y: (evt.clientY - r.top) * (H / r.height),
  };
}

function inRect(x, y, r) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

canvas.addEventListener('mousemove', (evt) => {
  const { x, y } = toGameCoords(evt);
  view.hover = -1;
  if (campaign.screen !== 'duel') return;
  for (let i = layout.cardRects.length - 1; i >= 0; i--) {
    if (inRect(x, y, layout.cardRects[i])) { view.hover = i; break; }
  }
});

canvas.addEventListener('click', (evt) => {
  unlockAudio();
  const { x, y } = toGameCoords(evt);
  if (campaign.screen === 'duel') {
    if (inRect(x, y, layout.endTurn)) { tryEndTurn(); return; }
    for (let i = layout.cardRects.length - 1; i >= 0; i--) {
      if (inRect(x, y, layout.cardRects[i])) { tryPlay(i); return; }
    }
  } else if (inRect(x, y, layout.primary)) {
    advanceScreen();
  }
});

window.addEventListener('keydown', (evt) => {
  unlockAudio();
  if (campaign.screen === 'duel') {
    if (evt.key >= '1' && evt.key <= '5') tryPlay(Number(evt.key) - 1);
    else if (evt.key === ' ') { evt.preventDefault(); tryEndTurn(); }
  } else if (evt.key === ' ' || evt.key === 'Enter') {
    evt.preventDefault();
    advanceScreen();
  }
});

// ---------------------------------------------------------- screenshot hook

function stageShot(name) {
  if (name === 'win') {
    startDuel(campaign, 0, 11);
    campaign.duelScores[0] = { rivalName: 'Tomas', rivalTitle: 'The Squire', turns: 6, healthKept: 210, speedBonus: 120, styleBonus: 0, killSource: 'card', total: 330 };
    startDuel(campaign, 1, 12);
    campaign.duelScores[1] = { rivalName: 'Odile', rivalTitle: 'The Duchess', turns: 8, healthKept: 170, speedBonus: 90, styleBonus: 150, killSource: 'mirror', total: 410 };
    campaign.totalScore = 740;
    const duel = startDuel(campaign, 2, 13);
    duel.rivalHp = 4;
    duel.hand = ['strike', 'guard', 'feast'];
    playCard(campaign, 0); // the killing Strike — a genuine scripted win
    return;
  }
  const duelNo = name === 'king' ? 2 : 0;
  const duel = startDuel(campaign, duelNo, 7);
  if (name === 'cover') {
    duel.playerHp = 24;
    duel.rivalHp = 19;
    duel.energy = 2;
    duel.turn = 3;
    duel.hand = ['strike', 'guard', 'venom', 'mirror', 'gambit'];
    duel.intent = { kind: 'strike', amount: 7 };
    duel.log = ['Tomas circles, blade low.', 'His intent is plain: a 7-point strike. Answer it.'];
  } else if (name === 'tense') {
    duel.playerHp = 9;
    duel.rivalHp = 11;
    duel.rivalBlock = 4;
    duel.energy = 1;
    duel.turn = 6;
    duel.playerVenom = { per: 2, turns: 2 };
    duel.mirrorUp = true;
    duel.hand = ['feast', 'snare', 'strike', 'decree'];
    duel.intent = { kind: 'strike', amount: 9, heavy: true };
    duel.log = ['Venom burns. The mirror is up.', 'A royal blow is coming — let it break on the glass.'];
  } else if (name === 'king') {
    duel.playerHp = 21;
    duel.rivalHp = 17;
    duel.energy = 3;
    duel.turn = 4;
    duel.rivalVenom = { per: 3, turns: 2 };
    duel.hand = ['decree', 'venom', 'guard', 'gambit', 'strike'];
    duel.intent = { kind: 'strike', amount: 13, heavy: true };
    duel.log = ['Venom eats at the King.', 'His royal blow gathers — 13 points of it.'];
  }
}

const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  stageShot(params.get('shot'));
} else if (params.get('duel')) {
  startDuel(campaign, Math.min(2, Math.max(0, Number(params.get('duel')) || 0)), 7);
}
drainFx();

// A handle for scripted play-tests: the same calls the mouse makes.
window.__game = {
  campaign: () => campaign,
  start: (i, seed) => startDuel(campaign, i, seed ?? 7),
  play: (i) => { const ok = playCard(campaign, i); drainFx(); return ok; },
  end: () => { endTurn(campaign); drainFx(); },
  advance: () => advanceScreen(),
  state: () => JSON.parse(JSON.stringify(campaign, (k, v) => (k === 'rng' || k === 'fx' ? undefined : v))),
};

// -------------------------------------------------------------------- loop

function frame(now) {
  draw(ctx, campaign, view, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
