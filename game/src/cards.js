// cards.js — the eight card types of Crown & Dagger and the player's deck.
//
// Every card is a plain record: its cost in Energy, the colours its face is
// painted with, the icon render.js draws for it, the one line of rules text
// printed on the card, and the numbers duel.js applies when it is played.
// Keeping the numbers here means the balance of the whole game can be read
// (and tuned) in this one file.

// Colours are chosen so each type reads at a glance, by colour and by icon,
// never by text alone: red sword, blue shield, green flask, silver mirror,
// amber dice, violet net, gold crown, rose goblet.
export const CARD_TYPES = {
  strike: {
    id: 'strike', name: 'Strike', cost: 1, icon: 'sword',
    band: '#b8402f', bandDark: '#7e2418',
    text: 'Deal 6 damage.',
    damage: 6,
  },
  guard: {
    id: 'guard', name: 'Guard', cost: 1, icon: 'shield',
    band: '#2f5f8f', bandDark: '#1d3f61',
    text: 'Gain 8 Block. Block soaks hits before Health.',
    block: 8,
  },
  venom: {
    id: 'venom', name: 'Venom', cost: 1, icon: 'flask',
    band: '#3f7d33', bandDark: '#274d1f',
    text: 'Poison: 3 damage at the start of their next 3 turns.',
    venomDamage: 3, venomTurns: 3,
  },
  feast: {
    id: 'feast', name: 'Feast', cost: 2, icon: 'goblet',
    band: '#a03d63', bandDark: '#6d2743',
    text: 'Restore 7 Health.',
    heal: 7,
  },
  mirror: {
    id: 'mirror', name: 'Mirror', cost: 1, icon: 'mirror',
    band: '#7d8894', bandDark: '#4c565f',
    text: "Reflect the rival's next attack back at them in full.",
  },
  gambit: {
    id: 'gambit', name: 'Gambit', cost: 1, icon: 'dice',
    band: '#c07f24', bandDark: '#845512',
    text: 'Draw 2 cards. Take 2 damage.',
    draw: 2, recoil: 2,
  },
  snare: {
    id: 'snare', name: 'Snare', cost: 1, icon: 'net',
    band: '#6b4fa1', bandDark: '#453166',
    text: "Weaken the rival's next intent: their blow lands 4 softer.",
    weaken: 4,
  },
  decree: {
    id: 'decree', name: 'Royal Decree', cost: 3, icon: 'crown',
    band: '#8f6b1d', bandDark: '#5f470f',
    text: 'Spend all your Energy. Deal 14 damage.',
    damage: 14,
  },
};

// The player's 17-card deck: a reliable core of Strikes and Guards, two
// Venoms and Feasts for the long game, and one each of the swingy cards.
const PLAYER_DECK_RECIPE = [
  'strike', 'strike', 'strike', 'strike', 'strike',
  'guard', 'guard', 'guard', 'guard',
  'venom', 'venom',
  'feast', 'feast',
  'mirror',
  'gambit',
  'snare',
  'decree',
];

// A fresh, shuffled copy of the player's deck. rng is a function returning
// [0, 1); duel.js passes its seeded generator so a duel can be replayed.
export function buildPlayerDeck(rng) {
  const deck = PLAYER_DECK_RECIPE.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}

export function cardType(id) {
  return CARD_TYPES[id];
}
