// Keyboard and mouse input: click a 3D card to play it, keys 1-5
// play by hand position, Space ends the turn, M toggles sound.
import { pickPlayerCard } from './render3d.js';

export function bindInput(canvas, handlers) {
  canvas.addEventListener('pointerdown', (ev) => {
    const index = pickPlayerCard(ev.clientX, ev.clientY);
    if (index >= 0) handlers.onCardClick(index);
  });
  document.getElementById('endturn').addEventListener('click', () => handlers.onEndTurn());
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    if (ev.code === 'Space' || ev.code === 'Enter') {
      ev.preventDefault();
      handlers.onEndTurn();
    } else if (/^Digit[1-7]$/.test(ev.code)) {
      handlers.onCardClick(Number(ev.code.slice(5)) - 1);
    } else if (ev.code === 'KeyM') {
      handlers.onMute();
    } else if (ev.code === 'KeyR') {
      handlers.onRestart();
    }
  });
  window.addEventListener('blur', () => handlers.onBlur && handlers.onBlur());
}
