// duel.js — the turn engine of Crown & Dagger.
//
// A campaign is three duels against RIVALS in order. A duel is a loop of
// player turns: the rival's intent is already on the table (rival.js), the
// player spends 3 Energy answering it, then endTurn() lets the rival act.
//
// Rules the engine enforces, in the order they bite:
//   - Block soaks damage before Health, and a side's Block falls at the
//     start of its own next act — guard on your turn, not forever.
//   - Venom ticks at the start of the afflicted side's act, through Block.
//   - A Mirror raised on any earlier turn reflects the rival's next strike
//     in full (the rival's own Block soaks the reflection), then shatters.
//   - A Snare rewrites the intent on the table the moment it is played.
//   - Gambit's recoil ignores Block: the price is always paid in Health.
//
// Everything the view needs to animate or announce is queued on duel.fx as
// { sfx, side, text, tone } events; main.js drains the queue each frame.

import { CARD_TYPES, buildPlayerDeck } from './cards.js';
import { RIVALS, chooseIntent } from './rival.js';

export const PLAYER_MAX_HP = 30;
export const HAND_SIZE = 5;
export const TURN_ENERGY = 3;

// A small seeded generator (mulberry32) so a duel can be replayed exactly
// for screenshots and tests; real play seeds it from the clock.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newCampaign() {
  return {
    screen: 'title',        // title | duel | duelWon | lost | campaignWon
    duelIndex: 0,
    duelScores: [],         // one summary per won duel, in order
    totalScore: 0,
    duel: null,
    lastSummary: null,
  };
}

export function startDuel(campaign, duelIndex, seed) {
  const rival = RIVALS[duelIndex];
  const rng = makeRng(seed);
  const duel = {
    index: duelIndex,
    rival,
    rng,
    turn: 1,
    playerHp: PLAYER_MAX_HP,
    playerBlock: 0,
    playerVenom: null,      // { per, turns }
    rivalHp: rival.maxHp,
    rivalBlock: 0,
    rivalVenom: null,       // { per, turns }
    energy: TURN_ENERGY,
    deck: buildPlayerDeck(rng),
    hand: [],
    discard: [],
    intent: null,
    mirrorUp: false,
    gambitThisTurn: false,
    killSource: null,       // card | venom | mirror | gambit-turn
    over: false,
    fx: [],
    log: [`${rival.name}, ${rival.title}, takes the far chair.`],
  };
  drawUpTo(duel, HAND_SIZE);
  duel.intent = chooseIntent(rival, duel.rivalHp, rival.maxHp, rng);
  campaign.duel = duel;
  campaign.duelIndex = duelIndex;
  campaign.screen = 'duel';
  return duel;
}

function drawUpTo(duel, n) {
  while (duel.hand.length < n) {
    if (duel.deck.length === 0) {
      duel.deck = duel.discard; duel.discard = [];
      for (let i = duel.deck.length - 1; i > 0; i--) {
        const j = Math.floor(duel.rng() * (i + 1));
        const t = duel.deck[i]; duel.deck[i] = duel.deck[j]; duel.deck[j] = t;
      }
      if (duel.deck.length === 0) break;
    }
    duel.hand.push(duel.deck.pop());
  }
}

// Damage one side, Block first. Returns the Health actually lost.
function dealDamage(duel, side, amount, source) {
  const blockKey = side === 'rival' ? 'rivalBlock' : 'playerBlock';
  const hpKey = side === 'rival' ? 'rivalHp' : 'playerHp';
  const soaked = Math.min(duel[blockKey], amount);
  duel[blockKey] -= soaked;
  const lost = amount - soaked;
  duel[hpKey] -= lost;
  if (amount > 0) {
    duel.fx.push({
      sfx: lost > 0 ? 'hit' : 'block',
      side, tone: lost > 0 ? 'damage' : 'block',
      text: lost > 0 ? `-${lost}` : 'Blocked',
    });
  }
  if (side === 'rival' && duel.rivalHp <= 0 && !duel.over) {
    duel.killSource = source;
  }
  return lost;
}

function tickVenom(duel, side) {
  const key = side === 'rival' ? 'rivalVenom' : 'playerVenom';
  const v = duel[key];
  if (!v) return;
  duel.fx.push({ sfx: 'venom', side, tone: 'venom', text: `Venom -${v.per}` });
  const hpKey = side === 'rival' ? 'rivalHp' : 'playerHp';
  duel[hpKey] -= v.per; // venom seeps past Block
  if (side === 'rival' && duel.rivalHp <= 0 && !duel.over) duel.killSource = 'venom';
  v.turns -= 1;
  if (v.turns <= 0) duel[key] = null;
}

function say(duel, line) {
  duel.log.push(line);
  if (duel.log.length > 3) duel.log.shift();
}

// Play the card at handIndex. Returns false (and changes nothing) when the
// card cannot be afforded; the view uses that to shake the card.
export function playCard(campaign, handIndex) {
  const duel = campaign.duel;
  if (!duel || duel.over || campaign.screen !== 'duel') return false;
  const id = duel.hand[handIndex];
  if (id === undefined) return false;
  const card = CARD_TYPES[id];
  if (card.cost > duel.energy) return false;

  duel.energy -= card.cost;
  duel.hand.splice(handIndex, 1);
  duel.discard.push(id);
  duel.fx.push({ sfx: 'play', side: 'player', tone: 'play', text: '' });

  switch (id) {
    case 'strike':
    case 'decree': {
      const before = duel.rivalHp;
      dealDamage(duel, 'rival', card.damage, duel.gambitThisTurn ? 'gambit-turn' : 'card');
      say(duel, `${card.name} — ${before - duel.rivalHp} past their guard.`);
      break;
    }
    case 'guard':
      duel.playerBlock += card.block;
      duel.fx.push({ sfx: 'guard', side: 'player', tone: 'block', text: `+${card.block} Block` });
      say(duel, `You raise ${card.block} Block.`);
      break;
    case 'venom': {
      const cur = duel.rivalVenom;
      duel.rivalVenom = { per: card.venomDamage, turns: (cur ? cur.turns : 0) + card.venomTurns };
      duel.fx.push({ sfx: 'venom', side: 'rival', tone: 'venom', text: 'Poisoned' });
      say(duel, 'Venom coats their cup rim.');
      break;
    }
    case 'feast': {
      const healed = Math.min(card.heal, PLAYER_MAX_HP - duel.playerHp);
      duel.playerHp += healed;
      duel.fx.push({ sfx: 'heal', side: 'player', tone: 'heal', text: `+${healed}` });
      say(duel, `You feast, restoring ${healed}.`);
      break;
    }
    case 'mirror':
      duel.mirrorUp = true;
      duel.fx.push({ sfx: 'mirror', side: 'player', tone: 'mirror', text: 'Mirror up' });
      say(duel, 'A silver mirror faces the rival.');
      break;
    case 'gambit': {
      duel.gambitThisTurn = true;
      const before = duel.hand.length;
      drawUpTo(duel, before + card.draw);
      duel.playerHp -= card.recoil; // recoil ignores Block, always
      duel.fx.push({ sfx: 'gambit', side: 'player', tone: 'damage', text: `-${card.recoil}` });
      say(duel, 'A reckless gambit: fresh cards, fresh blood.');
      break;
    }
    case 'snare': {
      applySnare(duel, card.weaken);
      duel.fx.push({ sfx: 'snare', side: 'rival', tone: 'snare', text: 'Snared' });
      say(duel, 'A snare tangles their plan.');
      break;
    }
  }

  settleDeaths(campaign);
  return true;
}

// Rewrite the intent on the table, softer in whatever it was going to do.
function applySnare(duel, weaken) {
  const it = duel.intent;
  if (!it || it.snared) return;
  it.snared = true;
  if (it.kind === 'strike') it.amount = Math.max(0, it.amount - weaken);
  else if (it.kind === 'feast') it.amount = Math.max(1, it.amount - weaken);
  else if (it.kind === 'guard') it.amount = Math.max(0, it.amount - weaken);
  else if (it.kind === 'venom') it.per = Math.max(1, it.per - 1);
}

// End the player's turn: the rival's venom ticks, the rival acts on its
// intent, then a fresh player turn begins (venom tick, energy, draw, and a
// new intent is chosen and displayed).
export function endTurn(campaign) {
  const duel = campaign.duel;
  if (!duel || duel.over || campaign.screen !== 'duel') return;

  // The rival's act begins: its Block falls, its venom ticks.
  duel.rivalBlock = 0;
  tickVenom(duel, 'rival');
  if (settleDeaths(campaign)) return;

  const it = duel.intent;
  if (it) {
    if (it.kind === 'strike') {
      if (duel.mirrorUp) {
        duel.mirrorUp = false;
        duel.fx.push({ sfx: 'mirror', side: 'rival', tone: 'mirror', text: 'Reflected!' });
        dealDamage(duel, 'rival', it.amount, 'mirror');
        say(duel, `The mirror throws their ${it.amount} back at them.`);
      } else {
        dealDamage(duel, 'player', it.amount, 'rival');
        say(duel, `${duel.rival.name} strikes for ${it.amount}.`);
      }
    } else if (it.kind === 'venom') {
      const cur = duel.playerVenom;
      duel.playerVenom = { per: it.per, turns: (cur ? cur.turns : 0) + it.turns };
      duel.fx.push({ sfx: 'venom', side: 'player', tone: 'venom', text: 'Poisoned' });
      say(duel, 'Something bitter slips into your cup.');
    } else if (it.kind === 'guard') {
      duel.rivalBlock += it.amount;
      duel.fx.push({ sfx: 'guard', side: 'rival', tone: 'block', text: `+${it.amount} Block` });
      say(duel, `${duel.rival.name} raises ${it.amount} Block.`);
    } else if (it.kind === 'feast') {
      const healed = Math.min(it.amount, duel.rival.maxHp - duel.rivalHp);
      duel.rivalHp += healed;
      duel.fx.push({ sfx: 'heal', side: 'rival', tone: 'heal', text: `+${healed}` });
      say(duel, `${duel.rival.name} feasts, restoring ${healed}.`);
    }
  }
  if (settleDeaths(campaign)) return;

  // A fresh player turn.
  duel.turn += 1;
  duel.playerBlock = 0;
  tickVenom(duel, 'player');
  if (settleDeaths(campaign)) return;
  duel.energy = TURN_ENERGY;
  duel.gambitThisTurn = false;
  drawUpTo(duel, HAND_SIZE);
  duel.intent = chooseIntent(duel.rival, duel.rivalHp, duel.rival.maxHp, duel.rng);
}

// Resolve deaths after any change. Returns true when the duel ended.
function settleDeaths(campaign) {
  const duel = campaign.duel;
  if (duel.over) return true;
  if (duel.rivalHp <= 0) {
    duel.over = true;
    const healthKept = Math.max(0, duel.playerHp) * 10;
    const speedBonus = Math.max(0, 14 - duel.turn) * 15;
    const styleBonus = (duel.killSource === 'mirror' || duel.killSource === 'gambit-turn') ? 150 : 0;
    const summary = {
      rivalName: duel.rival.name,
      rivalTitle: duel.rival.title,
      turns: duel.turn,
      healthKept, speedBonus, styleBonus,
      killSource: duel.killSource,
      total: healthKept + speedBonus + styleBonus,
    };
    campaign.duelScores[duel.index] = summary;
    campaign.totalScore = campaign.duelScores.reduce((s, x) => s + (x ? x.total : 0), 0);
    campaign.lastSummary = summary;
    campaign.screen = duel.index === RIVALS.length - 1 ? 'campaignWon' : 'duelWon';
    duel.fx.push({ sfx: 'win', side: 'rival', tone: 'win', text: 'DUEL WON' });
    return true;
  }
  if (duel.playerHp <= 0) {
    duel.over = true;
    campaign.screen = 'lost';
    duel.fx.push({ sfx: 'lose', side: 'player', tone: 'lose', text: 'DEFEATED' });
    return true;
  }
  return false;
}
