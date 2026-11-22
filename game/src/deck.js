// The card catalogue of Ember Court: four suits, each told apart by
// colour AND shape, with original names and effects. A card's cost is
// paid in mana; attack hits the rival's shield first, then life.
export const SUITS = {
  flame: { name: 'Flame', color: '#e23b2e', light: '#ff8a5c', glyph: 'flame', combo: 'FLAME COMBO: +3 damage', comboText: '+3 damage' },
  tide: { name: 'Tide', color: '#2f7fe0', light: '#6fb7ff', glyph: 'drop', combo: 'TIDE COMBO: +5 shield', comboText: '+5 shield' },
  leaf: { name: 'Leaf', color: '#3da53d', light: '#7ddb6a', glyph: 'leaf', combo: 'LEAF COMBO: heal 4', comboText: 'heal 4' },
  storm: { name: 'Storm', color: '#7b4fd0', light: '#c98aff', glyph: 'bolt', combo: 'STORM COMBO: +2 damage, draw 1', comboText: '+2 damage, draw 1' },
};

// id, suit, cost, attack, shield, heal, draw, copies in a 30-card deck.
const CATALOG = [
  { id: 'ember-lance', name: 'Ember Lance', suit: 'flame', cost: 2, attack: 5, shield: 0, heal: 0, draw: 0, copies: 3, text: 'A spear of court fire.' },
  { id: 'cinder-slash', name: 'Cinder Slash', suit: 'flame', cost: 1, attack: 3, shield: 0, heal: 0, draw: 0, copies: 3, text: 'Quick as a spark.' },
  { id: 'phoenix-roar', name: 'Phoenix Roar', suit: 'flame', cost: 4, attack: 8, shield: 0, heal: 0, draw: 0, copies: 2, text: 'The whole court hears it.' },
  { id: 'spark-imp', name: 'Spark Imp', suit: 'flame', cost: 1, attack: 2, shield: 0, heal: 0, draw: 1, copies: 2, text: 'Draw a card. It giggles.' },
  { id: 'tide-wall', name: 'Tide Wall', suit: 'tide', cost: 2, attack: 0, shield: 7, heal: 0, draw: 0, copies: 3, text: 'Water stands like stone.' },
  { id: 'deep-current', name: 'Deep Current', suit: 'tide', cost: 3, attack: 0, shield: 5, heal: 0, draw: 1, copies: 2, text: 'Shield 5. Draw a card.' },
  { id: 'frost-bind', name: 'Frost Bind', suit: 'tide', cost: 2, attack: 2, shield: 4, heal: 0, draw: 0, copies: 3, text: 'Cold that holds a blade.' },
  { id: 'thorn-vine', name: 'Thorn Vine', suit: 'leaf', cost: 2, attack: 4, shield: 0, heal: 2, draw: 0, copies: 3, text: 'It bites, then mends.' },
  { id: 'grove-blessing', name: 'Grove Blessing', suit: 'leaf', cost: 2, attack: 0, shield: 0, heal: 7, draw: 0, copies: 2, text: 'The old trees remember you.' },
  { id: 'seedling-sprout', name: 'Seedling Sprout', suit: 'leaf', cost: 1, attack: 0, shield: 0, heal: 1, draw: 2, copies: 3, text: 'Draw 2 cards. Heal 1.' },
  { id: 'storm-bolt', name: 'Storm Bolt', suit: 'storm', cost: 3, attack: 6, shield: 0, heal: 0, draw: 0, copies: 2, text: 'Lightning keeps no ledger.' },
  { id: 'trickster-gale', name: 'Trickster Gale', suit: 'storm', cost: 2, attack: 3, shield: 0, heal: 0, draw: 1, copies: 2, text: 'Draw a card. The wind laughs.' },
];

export const DECK_SIZE = 30;

/** A fresh 30-card deck (card objects), in catalogue order. */
export function buildDeck() {
  const deck = [];
  for (const entry of CATALOG) {
    for (let i = 0; i < entry.copies; i += 1) deck.push({ ...entry, uid: `${entry.id}#${i}` });
  }
  return deck;
}

/** Look a card definition up by id (for tests and staging). */
export function cardById(id) {
  return CATALOG.find((c) => c.id === id) || null;
}

export const MAX_LIFE = 30;
export const MAX_HAND = 7;
export const MAX_MANA = 10;
