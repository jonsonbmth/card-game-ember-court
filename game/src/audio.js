// Procedural sound effects, synthesized with WebAudio: no audio
// files. The context starts suspended and resumes on the first
// gesture, as browsers require.
let ctx = null;
let muted = false;

function ensure() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function soundClick() { tone(660, 0.07, 'triangle', 0.08); }
export function soundDeal() {
  tone(520, 0.06, 'triangle', 0.07);
  tone(760, 0.06, 'triangle', 0.07, 0.07);
}
export function soundPlay() {
  tone(392, 0.1, 'triangle', 0.1);
  tone(587, 0.14, 'triangle', 0.1, 0.08);
}
export function soundCombo() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.07));
}
export function soundHurt() { tone(160, 0.22, 'sawtooth', 0.08); }
export function soundWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.11));
}
export function soundLose() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'sine', 0.1, i * 0.14));
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function unlockAudio() { ensure(); }
