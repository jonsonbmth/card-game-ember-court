// Staged screenshots and scripted self-tests. Each shot plays the
// real rules forward from a fixed seed, so the frame is what a real
// game looks like — never a mock. ?shot=title|play|win|loss&seed=N.
// ?selftest=win|loss runs a full autopilot duel and writes the result
// into #selftest-result for the headless harness.
import { newGame, startDuel, playCard, beginTurn, checkEnd, PHASE_PLAYER, PHASE_OVER } from './game.js';
import { makeRng } from './rng.js';
import { choosePlays } from './ai.js';
import { cardById } from './deck.js';

/** A simple autopilot: play the best affordable card, then end turn. */
export function autopilotPlay(state) {
  const hand = state.you.hand;
  let best = -1;
  let bestScore = -1;
  hand.forEach((c, i) => {
    if (c.cost > state.you.mana) return;
    const score = c.attack * 2 + c.shield + c.heal + c.draw * 1.5 - c.cost * 0.5;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

/** Run the AI's whole turn instantly (no animation): used by staging. */
export function runAiTurnInstant(state) {
  beginTurn(state, 'foe');
  // Recompute the greedy choice after every play: indices shift as
  // cards leave the hand.
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    const picks = choosePlays(state);
    if (!picks.length) break;
    const report = playCard(state, 'foe', picks[0]);
    if (!report.ok || state.phase === PHASE_OVER) break;
  }
  return state;
}

/** Play full turns (player autopilot + instant AI) until `until` says stop. */
export function simulate(state, until, maxTurns = 40) {
  let turns = 0;
  while (turns < maxTurns) {
    turns += 1;
    if (state.phase === PHASE_OVER) break;
    if (until(state)) break;
    if (state.phase === PHASE_PLAYER) {
      let guard = 0;
      while (guard < 12) {
        guard += 1;
        const idx = autopilotPlay(state);
        if (idx < 0) break;
        const report = playCard(state, 'you', idx);
        if (!report.ok || state.phase === PHASE_OVER) break;
      }
      if (state.phase === PHASE_OVER) break;
      runAiTurnInstant(state);
      if (state.phase === PHASE_OVER) break;
      beginTurn(state, 'you');
      state.phase = PHASE_PLAYER;
    }
  }
  return state;
}

/** Put a card with this id into the player's hand (for staged shots). */
export function giveCard(state, id) {
  const def = cardById(id);
  if (!def) return null;
  const card = { ...def, uid: `staged-${id}` };
  state.you.hand.push(card);
  return card;
}

/**
 * Build the named scene on a fresh game and return the screen to show:
 * 'title' | 'play' | 'win' | 'loss'.
 */
export function stageShot(name, seed) {
  const rng = makeRng(seed);
  const state = newGame(rng);
  startDuel(state);
  if (name === 'title') {
    state.phase = 'title';
    return { state, screen: 'title' };
  }
  if (name === 'play') {
    // A real mid-game: three full turns of autopilot on both sides.
    simulate(state, (s) => s.turn >= 4);
    state.phase = PHASE_PLAYER;
    return { state, screen: 'play' };
  }
  if (name === 'win') {
    // Mara at 3 life; the player holds Ember Lance (5 damage) and 5 mana.
    state.foe.life = 3;
    state.you.mana = 5;
    state.you.manaMax = 5;
    giveCard(state, 'ember-lance');
    const idx = state.you.hand.findIndex((c) => c.id === 'ember-lance');
    playCard(state, 'you', idx);
    return { state, screen: 'win' };
  }
  // loss: the player at 3 life; Mara's Storm Bolt (6 damage) ends it.
  state.you.life = 3;
  state.foe.hand = [{ ...cardById('storm-bolt'), uid: 'staged-storm-bolt' }];
  state.foe.mana = 5;
  state.foe.manaMax = 5;
  playCard(state, 'foe', 0);
  checkEnd(state);
  return { state, screen: 'loss' };
}

/** Full autopilot duel to the end; returns 'win' or 'loss' for the player. */
export function selftestDuel(seed, wantWin) {
  const rng = makeRng(seed);
  const state = newGame(rng);
  startDuel(state);
  if (wantWin) {
    // Rig the duel in the player's favour: Mara starts at 8 life.
    state.foe.life = 8;
  } else {
    state.you.life = 5;
  }
  simulate(state, () => false, 60);
  if (state.phase !== PHASE_OVER) return 'timeout';
  return state.winner === 'you' ? 'win' : 'loss';
}
