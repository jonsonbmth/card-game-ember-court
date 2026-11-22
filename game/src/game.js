// The rules of Ember Court, free of any DOM or 3D code so the logic
// can be driven headlessly. One duel: you and Mara, the Ember Duchess,
// 30 life each, mana that grows by 1 every turn (max 10) and refills at
// the start of your turn. Play cards, chain two of one suit in a turn
// for a combo bonus, and bring Mara's life to 0 before she does yours.
import { buildDeck, MAX_LIFE, MAX_HAND, MAX_MANA, SUITS } from './deck.js';
import { shuffled } from './rng.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAYER = 'player';
export const PHASE_AI = 'ai';
export const PHASE_OVER = 'over';

/** A fresh duel. `rng` is the seeded source for both decks. */
export function newGame(rng) {
  const state = {
    phase: PHASE_TITLE,
    turn: 1,
    rng,
    you: freshSide(rng),
    foe: freshSide(rng),
    // Suits played this turn, per side, for combo tracking.
    playedSuits: { you: [], foe: [] },
    comboFired: { you: {}, foe: {} },
    log: [],
    winner: null,
    turnCount: 0,
  };
  return state;
}

function freshSide(rng) {
  const deck = shuffled(buildDeck(), rng);
  const hand = deck.splice(0, 3);
  return { life: MAX_LIFE, shield: 0, mana: 1, manaMax: 1, deck, hand, discard: [] };
}

/** Start a duel from the title screen: mana 1, hand of 3. */
export function startDuel(state) {
  state.phase = PHASE_PLAYER;
  state.turn = 1;
  state.turnCount = 1;
  state.you.mana = 1;
  state.you.manaMax = 1;
  state.log.push('The duel begins. Your turn.');
  return state;
}

/** Draw `n` cards for a side (reshuffling the discard when empty). */
export function drawCards(state, side, n) {
  const s = state[side];
  for (let i = 0; i < n; i += 1) {
    if (s.deck.length === 0) {
      if (s.discard.length === 0) return;
      s.deck = shuffled(s.discard, state.rng);
      s.discard = [];
    }
    if (s.hand.length >= MAX_HAND) return;
    s.hand.push(s.deck.shift());
  }
}

/** Begin a side's turn: mana grows, refills, shield fades, draw 2. */
export function beginTurn(state, side) {
  const s = state[side];
  s.manaMax = Math.min(MAX_MANA, s.manaMax + 1);
  s.mana = s.manaMax;
  s.shield = 0;
  state.playedSuits[side] = [];
  state.comboFired[side] = {};
  drawCards(state, side, 2);
  if (side === 'you') {
    state.turn += 1;
    state.turnCount += 1;
  }
}

/** Apply raw damage to a side, shield soaking first. Returns damage to life. */
export function dealDamage(state, side, amount) {
  const s = state[side];
  const soaked = Math.min(s.shield, amount);
  s.shield -= soaked;
  const toLife = amount - soaked;
  s.life = Math.max(0, s.life - toLife);
  return toLife;
}

function healSide(state, side, amount) {
  const s = state[side];
  s.life = Math.min(MAX_LIFE, s.life + amount);
}

function shieldSide(state, side, amount) {
  state[side].shield += amount;
}

/** The combo bonus for playing a second card of `suit` in one turn. */
export function comboBonus(suit) {
  if (suit === 'flame') return { attack: 3, shield: 0, heal: 0, draw: 0 };
  if (suit === 'tide') return { attack: 0, shield: 5, heal: 0, draw: 0 };
  if (suit === 'leaf') return { attack: 0, shield: 0, heal: 4, draw: 0 };
  return { attack: 2, shield: 0, heal: 0, draw: 1 }; // storm
}

function applyBonus(state, side, bonus, foeSide) {
  if (bonus.attack) dealDamage(state, foeSide, bonus.attack);
  if (bonus.shield) shieldSide(state, side, bonus.shield);
  if (bonus.heal) healSide(state, side, bonus.heal);
  if (bonus.draw) drawCards(state, side, bonus.draw);
}

/**
 * Play the card at `handIndex` for `side`. Returns a report describing
 * what happened (or { ok: false, reason } when the play is illegal).
 */
export function playCard(state, side, handIndex) {
  const me = state[side];
  const foeSide = side === 'you' ? 'foe' : 'you';
  const card = me.hand[handIndex];
  if (!card) return { ok: false, reason: 'no such card' };
  if (me.mana < card.cost) return { ok: false, reason: 'not enough mana' };
  me.mana -= card.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(card);

  let attack = card.attack;
  let combo = null;
  const played = state.playedSuits[side];
  played.push(card.suit);
  if (played.filter((s) => s === card.suit).length === 2 && !state.comboFired[side][card.suit]) {
    state.comboFired[side][card.suit] = true;
    combo = { suit: card.suit, bonus: comboBonus(card.suit), text: SUITS[card.suit].combo };
    attack += combo.bonus.attack;
  }
  if (attack) dealDamage(state, foeSide, attack);
  if (card.shield) shieldSide(state, side, card.shield);
  if (card.heal) healSide(state, side, card.heal);
  if (card.draw) drawCards(state, side, card.draw);
  if (combo) applyBonus(state, side, { ...combo.bonus, attack: 0 }, foeSide);

  const over = checkEnd(state);
  const who = side === 'you' ? 'You' : 'Mara';
  state.log.push(`${who} played ${card.name}${combo ? ` — ${combo.text}` : ''}.`);
  return { ok: true, card, attack, combo, over, winner: state.winner };
}

/** Set the winner when a life total hits 0. Returns true when over. */
export function checkEnd(state) {
  if (state.foe.life <= 0) {
    state.winner = 'you';
    state.phase = PHASE_OVER;
    state.log.push('Mara falls. The Ember Court is yours!');
    return true;
  }
  if (state.you.life <= 0) {
    state.winner = 'foe';
    state.phase = PHASE_OVER;
    state.log.push('You fall. Mara keeps the throne.');
    return true;
  }
  return false;
}

/** End the player's turn: the AI takes its turn, then a new player turn. */
export function endPlayerTurn(state) {
  if (state.phase !== PHASE_PLAYER) return { ok: false, reason: 'not your turn' };
  state.phase = PHASE_AI;
  return { ok: true };
}

/** After the AI finishes, hand the turn back to the player. */
export function startPlayerTurn(state) {
  beginTurn(state, 'you');
  state.phase = PHASE_PLAYER;
  state.log.push(`Turn ${state.turn}: your move.`);
}
