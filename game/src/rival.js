// rival.js — the three rivals of Crown & Dagger and their intent AI.
//
// A rival never hides what it is about to do. At the start of the player's
// turn chooseIntent() picks the rival's next act and the game displays it
// above the portrait ("Will strike for 7"). The player's whole turn is then
// an answer to that one telegraphed move: block it, mirror it, snare it
// softer, or kill the rival before it lands.
//
// An intent is one of:
//   { kind: 'strike', amount }        damage, soaked by the player's Block
//   { kind: 'venom', per, turns }     poison on the player, ticks each turn
//   { kind: 'guard', amount }         the rival raises Block
//   { kind: 'feast', amount }         the rival heals
// Snare rewrites a strike intent's amount (see duel.js), never its kind.

export const RIVALS = [
  {
    name: 'Tomas', title: 'The Squire', maxHp: 30,
    taunt: 'Mind the good table, friend.',
    portrait: { skin: '#eec39b', hair: '#6b4423', cloth: '#4d7a52', trim: '#d9a441', style: 'cap' },
    // A honest beginner: mostly plain strikes, a guard when pressed.
    weights: { strike: 62, guard: 20, venom: 0, feast: 18 },
    strikeMin: 5, strikeMax: 7, guardAmount: 6, feastAmount: 5,
    venomPer: 0, venomTurns: 0, heavyChance: 0, heavyBonus: 0,
  },
  {
    name: 'Odile', title: 'The Duchess', maxHp: 30,
    taunt: 'Darling, I poison dukes for practice.',
    portrait: { skin: '#f2cfae', hair: '#2e2a33', cloth: '#6d2743', trim: '#c9ccd6', style: 'circlet' },
    // A poisoner: venom to wear you down, feasts to outlast you.
    weights: { strike: 44, guard: 16, venom: 24, feast: 16 },
    strikeMin: 6, strikeMax: 9, guardAmount: 8, feastAmount: 6,
    venomPer: 2, venomTurns: 3, heavyChance: 0, heavyBonus: 0,
  },
  {
    name: 'Aldric', title: 'The Crownless King', maxHp: 30,
    taunt: 'I lost a crown. I keep the table.',
    portrait: { skin: '#e3b184', hair: '#cfd2d8', cloth: '#33354d', trim: '#d9a441', style: 'crown' },
    // The final wall: heavy telegraphed blows, strong venom, deep guards.
    weights: { strike: 52, guard: 14, venom: 18, feast: 16 },
    strikeMin: 8, strikeMax: 11, guardAmount: 10, feastAmount: 8,
    venomPer: 3, venomTurns: 3, heavyChance: 0.22, heavyBonus: 4,
  },
];

// Pick the rival's next intent. hp and maxHp describe the rival itself;
// a wounded rival feasts more and guards more, which the player can read
// in the intent plaque like everything else. rng returns [0, 1).
export function chooseIntent(rival, hp, maxHp, rng) {
  const w = { ...rival.weights };
  if (hp <= maxHp * 0.45) { w.feast += 14; w.guard += 8; w.strike -= 12; }
  if (hp >= maxHp) { w.feast = 0; } // nothing to heal at full health
  if (rival.venomPer === 0) { w.venom = 0; }

  let total = 0;
  for (const k of Object.keys(w)) total += Math.max(0, w[k]);
  let roll = rng() * total;
  let kind = 'strike';
  for (const k of ['strike', 'guard', 'venom', 'feast']) {
    roll -= Math.max(0, w[k]);
    if (roll <= 0) { kind = k; break; }
  }

  if (kind === 'strike') {
    let amount = rival.strikeMin + Math.floor(rng() * (rival.strikeMax - rival.strikeMin + 1));
    let heavy = false;
    if (rng() < rival.heavyChance) { amount += rival.heavyBonus; heavy = true; }
    return { kind, amount, heavy };
  }
  if (kind === 'venom') return { kind, per: rival.venomPer, turns: rival.venomTurns };
  if (kind === 'guard') return { kind, amount: rival.guardAmount };
  return { kind: 'feast', amount: rival.feastAmount };
}

// The one line the intent plaque prints for an intent.
export function intentLabel(intent) {
  switch (intent.kind) {
    case 'strike': return intent.heavy ? `ROYAL BLOW: will strike for ${intent.amount}` : `Will strike for ${intent.amount}`;
    case 'venom': return `Brewing venom: ${intent.per} a turn, ${intent.turns} turns`;
    case 'guard': return `Will raise ${intent.amount} Block`;
    case 'feast': return `Will feast: heal ${intent.amount}`;
    default: return 'Watching you…';
  }
}
