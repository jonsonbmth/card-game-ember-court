// Mara, the Ember Duchess: a readable, counterable opponent. Before
// her turn she announces an intent (STRIKE, GUARD or SCHEME) drawn from
// the hand she actually holds, so the player can answer it. She plays
// greedily: the best damage first, then shields when hurt, then draw.
import { playCard } from './game.js';

/** The intent Mara shows at the start of the player's turn. */
export function chooseIntent(state) {
  const foe = state.foe;
  const hand = foe.hand;
  const canSpend = hand.filter((c) => c.cost <= foe.mana);
  const attack = canSpend.reduce((sum, c) => sum + c.attack, 0);
  if (foe.life <= 12 && hand.some((c) => c.shield > 0 || c.heal > 0)) return 'GUARD';
  if (attack >= 6) return 'STRIKE';
  if (hand.some((c) => c.draw > 0)) return 'SCHEME';
  if (canSpend.length === 0) return 'SCHEME';
  return attack >= 3 ? 'STRIKE' : 'GUARD';
}

export const INTENT_TEXT = {
  STRIKE: 'Mara plans: STRIKE — she will hit hard. Raise a shield or end it first.',
  GUARD: 'Mara plans: GUARD — she will turtle up. Save your big cards.',
  SCHEME: 'Mara plans: SCHEME — she will draw and trick. Press the attack.',
};

/**
 * Pick Mara's plays for this turn, in order: a list of hand indices
 * (against the live hand, so the caller re-reads after each play).
 * Greedy by value: damage first, then shield when low, then draw.
 */
export function choosePlays(state) {
  const foe = state.foe;
  const plays = [];
  let mana = foe.mana;
  const hand = foe.hand.slice();
  // Value a card: damage matters most, shield when hurt, draw always handy.
  const value = (c) => c.attack * 2 + (foe.life <= 14 ? c.shield * 1.6 : c.shield * 0.7) + c.heal * 1.2 + c.draw * 1.5 - c.cost * 0.4;
  const order = hand.map((c, i) => ({ c, i })).sort((a, b) => value(b.c) - value(a.c));
  const used = new Set();
  for (const { c, i } of order) {
    if (used.has(i)) continue;
    if (c.cost <= mana) {
      plays.push(i);
      used.add(i);
      mana -= c.cost;
    }
  }
  return plays;
}

/**
 * Play one AI card by its current hand index. Returns the play report,
 * or null when the index is no longer valid.
 */
export function aiPlayOne(state, handIndex) {
  if (handIndex < 0 || handIndex >= state.foe.hand.length) return null;
  return playCard(state, 'foe', handIndex);
}
