// The DOM overlay: life and mana bars, Mara's intent, the combo
// meter, banners, toasts and the title / win / loss screens. The 3D
// scene is the table; this is the readable layer on top of it.
import { SUITS } from './deck.js';
import { INTENT_TEXT } from './ai.js';

const $ = (id) => document.getElementById(id);

export function showBanner(text, sub = '') {
  const b = $('banner');
  b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  b.style.opacity = '1';
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => { b.style.opacity = '0'; }, 1500);
}

export function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.style.opacity = '1';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.style.opacity = '0'; }, 1800);
}

export function syncHud(state) {
  $('turn-num').textContent = state.turn;
  $('deck-count').textContent = state.you.deck.length;
  $('foe-deck').textContent = state.foe.deck.length;
  $('foe-life').textContent = state.foe.life;
  $('foe-life-bar').style.width = `${(state.foe.life / 30) * 100}%`;
  $('foe-shield').textContent = state.foe.shield;
  $('foe-shield-bar').style.width = `${Math.min(100, state.foe.shield * 8)}%`;
  $('me-life').textContent = state.you.life;
  $('me-life-bar').style.width = `${(state.you.life / 30) * 100}%`;
  $('me-shield').textContent = state.you.shield;
  $('me-shield-bar').style.width = `${Math.min(100, state.you.shield * 8)}%`;
  $('me-mana').textContent = state.you.mana;
  $('me-mana-max').textContent = state.you.manaMax;
  $('me-mana-bar').style.width = `${(state.you.mana / state.you.manaMax) * 100}%`;
  $('endturn').disabled = state.phase !== 'player';

  // Combo meter: how many of each suit have been played this turn.
  const counts = {};
  for (const s of state.playedSuits.you) counts[s] = (counts[s] || 0) + 1;
  const parts = Object.entries(counts).map(([suit, n]) => {
    const info = SUITS[suit];
    const done = n >= 2;
    return `<span><span class="pip" style="background:${info.color}"></span>${info.name} ×${n}${done ? ' — COMBO!' : ''}</span>`;
  });
  $('combo').innerHTML = parts.length
    ? `This turn: ${parts.join(' &nbsp; ')}`
    : 'Play two cards of one suit in a turn to trigger its combo.';
}

/** Show Mara's announced intent for her next turn. */
export function showIntent(intent) {
  $('intent').innerHTML = INTENT_TEXT[intent] || `Mara plans: <b>${intent}</b>`;
}

function overlayHtml(inner) {
  $('overlay-card').innerHTML = inner;
  $('overlay').style.display = 'flex';
}

export function showTitle(onPlay) {
  overlayHtml(`
    <h1>EMBER COURT</h1>
    <p><b>A 3D card duel in the golden hall.</b> You are the Challenger.<br>
    Across the table sits <b>Mara, the Ember Duchess</b> — and Odo the dealer keeps the game honest.</p>
    <div class="rules">
      <p><b>Goal:</b> bring Mara's life from 30 to 0 before she does yours.</p>
      <p><b>Mana:</b> grows by 1 each turn (max 10) and refills. Cards cost mana.</p>
      <p><b>Suits:</b> <span style="color:#ff6b5e">Flame</span> hits hard, <span style="color:#6fb7ff">Tide</span> shields, <span style="color:#7ddb6a">Leaf</span> heals &amp; draws, <span style="color:#c98aff">Storm</span> tricks. Two of one suit in a turn triggers its combo.</p>
      <p><b>Read her:</b> Mara announces her plan each turn — STRIKE, GUARD or SCHEME — so you can answer it.</p>
      <p><b>Controls:</b> click a card or press 1–5 to play it · Space ends your turn · M toggles sound.</p>
    </div>
    <button id="playbtn">TAKE YOUR SEAT</button>`);
  $('overlay').style.display = 'flex';
  $('playbtn').addEventListener('click', () => {
    $('overlay').style.display = 'none';
    onPlay();
  });
}

export function showEnd(state, onAgain) {
  const won = state.winner === 'you';
  overlayHtml(`
    <h2>${won ? '👑 VICTORY!' : '💔 DEFEAT'}</h2>
    <p style="font-size:19px">${won
      ? 'Mara bows. The Ember Court is yours — the golden hall applauds the new Champion.'
      : 'Mara keeps the throne. Odo gathers the cards. The court waits for your rematch.'}</p>
    <p>Final life — You <b>${state.you.life}</b> · Mara <b>${state.foe.life}</b> · ${state.turnCount} turns played</p>
    <button id="playbtn">${won ? 'DEFEND THE COURT' : 'REMATCH'}</button>`);
  $('overlay').style.display = 'flex';
  $('playbtn').addEventListener('click', () => {
    $('overlay').style.display = 'none';
    onAgain();
  });
}

export function hideOverlay() {
  $('overlay').style.display = 'none';
}

export function setStatus(text) {
  $('status').textContent = text;
}
