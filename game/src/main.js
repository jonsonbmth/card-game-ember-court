// Ember Court: bootstrap, the animation loop, and the turn driver.
// The rules live in game.js, the opponent in ai.js, the 3D scene in
// render3d.js and the overlay in hud.js — this file only wires them.
import { newGame, startDuel, playCard, endPlayerTurn, startPlayerTurn, beginTurn, PHASE_PLAYER, PHASE_AI, PHASE_OVER } from './game.js';
import { makeRng } from './rng.js';
import { chooseIntent, choosePlays, aiPlayOne, INTENT_TEXT } from './ai.js';
import { initRenderer, syncHands, animatePlay, winBurst, renderFrame } from './render3d.js';
import { syncHud, showBanner, showToast, showIntent, showTitle, showEnd, hideOverlay, setStatus } from './hud.js';
import { bindInput } from './input.js';
import { soundClick, soundDeal, soundPlay, soundCombo, soundHurt, soundWin, soundLose, toggleMute, unlockAudio } from './audio.js';
import { stageShot, selftestDuel, runAiTurnInstant } from './shots.js';

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed') || '7');
let state = null;
let aiBusy = false;
let intent = 'STRIKE';
let lastPhase = null;

const canvas = document.getElementById('scene');

function freshState(seed) {
  return newGame(makeRng(seed));
}

function refresh() {
  syncHands(state);
  syncHud(state);
  setStatus(`Turn ${state.turn}. You ${state.you.life} life, Mara ${state.foe.life} life. ${state.phase === 'player' ? 'Your turn.' : ''}`);
}

function afterPlay(report, side) {
  if (!report.ok) return;
  if (report.combo) {
    showToast(report.combo.text);
    soundCombo();
  } else {
    soundPlay();
  }
  if (report.attack > 0) soundHurt();
  refresh();
  if (report.over) endGame();
}

function endGame() {
  const won = state.winner === 'you';
  if (won) { winBurst(); soundWin(); } else { soundLose(); }
  setTimeout(() => showEnd(state, restart), won ? 1400 : 900);
  refresh();
}

function restart() {
  state = freshState(seedParam);
  startDuel(state);
  intent = chooseIntent(state);
  showIntent(intent);
  hideOverlay();
  showBanner('YOUR TURN', 'Mana 1 · draw to begin');
  soundDeal();
  refresh();
}

function onCardClick(index) {
  if (!state || state.phase !== PHASE_PLAYER || aiBusy) return;
  if (index < 0 || index >= state.you.hand.length) return;
  const card = state.you.hand[index];
  if (card.cost > state.you.mana) {
    showToast('Not enough mana for that card.');
    return;
  }
  unlockAudio();
  soundClick();
  const uid = card.uid;
  const report = playCard(state, 'you', index);
  animatePlay(uid, 'you', () => refresh());
  afterPlay(report, 'you');
}

function onEndTurn() {
  if (!state || state.phase !== PHASE_PLAYER || aiBusy) return;
  unlockAudio();
  soundClick();
  endPlayerTurn(state);
  refresh();
  runAiTurn();
}

/** Mara's turn, animated: one card at a time, then back to the player. */
function runAiTurn() {
  aiBusy = true;
  showBanner("MARA'S TURN", INTENT_TEXT[intent].split('—')[1]?.trim() || '');
  // Mara draws and her mana grows at the start of her turn.
  beginTurn(state, 'foe');
  intent = chooseIntent(state);
  let i = 0;
  const step = () => {
    if (state.phase === PHASE_OVER) { aiBusy = false; endGame(); return; }
    // Recompute after every play: indices shift as cards leave her hand.
    const picks = choosePlays(state);
    if (i >= 10 || !picks.length) {
      // Her turn is done: a fresh player turn, and her next intent.
      startPlayerTurn(state);
      intent = chooseIntent(state);
      showIntent(intent);
      showBanner('YOUR TURN', `Mana ${state.you.manaMax} · Mara plans: ${intent}`);
      soundDeal();
      aiBusy = false;
      refresh();
      return;
    }
    i += 1;
    const idx = picks[0];
    const card = state.foe.hand[idx];
    if (!card) { step(); return; }
    const report = aiPlayOne(state, idx);
    if (report && report.ok) {
      showToast(`Mara plays ${card.name}`);
      if (report.combo) showToast(report.combo.text);
      refresh();
      if (report.over) { aiBusy = false; endGame(); return; }
    }
    setTimeout(step, 850);
  };
  setTimeout(step, 700);
}

function onMute() {
  const muted = toggleMute();
  showToast(muted ? 'Sound off' : 'Sound on');
}

function loop() {
  if (state) syncHands(state);
  renderFrame(1 / 60);
  requestAnimationFrame(loop);
}

function boot() {
  initRenderer(canvas);
  bindInput(canvas, {
    onCardClick,
    onEndTurn,
    onMute,
    onRestart: () => { if (state && state.phase === PHASE_OVER) restart(); },
  });

  const shot = params.get('shot');
  const selftest = params.get('selftest');
  if (selftest) {
    // Headless playtest: run a full duel and report the result.
    const result = selftestDuel(seedParam, selftest === 'win');
    const el = document.createElement('div');
    el.id = 'selftest-result';
    el.textContent = `selftest ${selftest}: ${result}`;
    document.body.appendChild(el);
    state = freshState(seedParam);
    startDuel(state);
    refresh();
    loop();
    return;
  }

  if (shot) {
    const { state: staged, screen } = stageShot(shot, seedParam);
    state = staged;
    hideOverlay();
    intent = chooseIntent(state);
    showIntent(intent);
    if (screen === 'title') {
      showTitle(() => {});
      // Keep the title overlay visible for the cover shot.
    } else if (screen === 'win') {
      winBurst();
      // A second burst so gold is still falling when the shot is taken.
      setTimeout(() => winBurst(), 3800);
      setTimeout(() => showEnd(state, () => {}), 600);
    } else if (screen === 'loss') {
      setTimeout(() => showEnd(state, () => {}), 600);
    }
    refresh();
    loop();
    return;
  }

  // Normal play: title screen first, then the duel.
  state = freshState(seedParam);
  showTitle(() => {
    startDuel(state);
    intent = chooseIntent(state);
    showIntent(intent);
    showBanner('YOUR TURN', 'Mana 1 · draw to begin');
    soundDeal();
    refresh();
  });
  refresh();
  loop();
}

boot();

// Headless hooks for the playtest harness.
window.__ember = {
  get state() { return state; },
  playCard: (i) => onCardClick(i),
  endTurn: () => onEndTurn(),
  restart,
  runAiTurnInstant,
};
