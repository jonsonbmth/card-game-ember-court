// Card faces and backs, drawn to canvas at runtime: no image files,
// no copied art. Each face carries the suit colour AND a big shape
// glyph, the cost in a gold coin, the attack as a large number, and
// the card's text — legible even at thumbnail size.
import { SUITS } from './deck.js';

export const CARD_W = 256;
export const CARD_H = 384;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw one suit glyph (flame / drop / leaf / bolt) centred at (x, y). */
export function drawGlyph(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineJoin = 'round';
  const s = size;
  ctx.beginPath();
  if (glyph === 'flame') {
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.42, -s * 0.1, s * 0.34, s * 0.28, s * 0.12, s * 0.34);
    ctx.bezierCurveTo(s * 0.3, s * 0.18, s * 0.16, -s * 0.02, 0, -s * 0.06);
    ctx.bezierCurveTo(-s * 0.2, s * 0.08, -s * 0.34, s * 0.2, -s * 0.3, s * 0.34);
    ctx.bezierCurveTo(-s * 0.42, s * 0.1, -s * 0.3, -s * 0.28, 0, -s * 0.5);
  } else if (glyph === 'drop') {
    ctx.moveTo(0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.42, s * 0.05, s * 0.38, s * 0.5, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.38, s * 0.5, -s * 0.42, s * 0.05, 0, -s * 0.55);
  } else if (glyph === 'leaf') {
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.5, -s * 0.2, s * 0.42, s * 0.42, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.42, s * 0.42, -s * 0.5, -s * 0.2, 0, -s * 0.5);
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(0, s * 0.42);
  } else { // bolt
    ctx.moveTo(s * 0.12, -s * 0.55);
    ctx.lineTo(-s * 0.28, s * 0.08);
    ctx.lineTo(-s * 0.02, s * 0.08);
    ctx.lineTo(-s * 0.12, s * 0.55);
    ctx.lineTo(s * 0.3, -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.08);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Paint a card's face onto a fresh canvas and return it. */
export function makeCardFace(card) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const suit = SUITS[card.suit];

  // Parchment face with a suit-coloured frame.
  ctx.fillStyle = '#f7ecd2';
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 22);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = suit.color;
  roundRect(ctx, 6, 6, CARD_W - 12, CARD_H - 12, 18);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c9a227';
  roundRect(ctx, 16, 16, CARD_W - 32, CARD_H - 32, 12);
  ctx.stroke();

  // Cost coin, top left.
  ctx.beginPath();
  ctx.arc(44, 46, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#e0a92e';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8a6a10';
  ctx.stroke();
  ctx.fillStyle = '#241a05';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), 44, 48);

  // Suit name, top right.
  ctx.fillStyle = suit.color;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(suit.name.toUpperCase(), CARD_W - 26, 42);

  // Big glyph in the middle.
  ctx.fillStyle = suit.color;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(CARD_W / 2, 168, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawGlyph(ctx, suit.glyph, CARD_W / 2, 168, 130, suit.color);

  // Card name.
  ctx.fillStyle = '#241a05';
  ctx.font = 'bold 27px Georgia, serif';
  ctx.textAlign = 'center';
  const nameLines = wrapText(ctx, card.name, CARD_W - 44);
  nameLines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, 292 + i * 30));

  // Attack / shield / heal line, big and readable.
  const stats = [];
  if (card.attack) stats.push(`⚔ ${card.attack}`);
  if (card.shield) stats.push(`🛡 ${card.shield}`);
  if (card.heal) stats.push(`✚ ${card.heal}`);
  if (card.draw) stats.push(`⇥ ${card.draw}`);
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillStyle = '#7a1f16';
  ctx.fillText(stats.join('   ') || '—', CARD_W / 2, 330);

  // Flavour text.
  ctx.fillStyle = '#5c4a26';
  ctx.font = 'italic 16px Georgia, serif';
  const flav = wrapText(ctx, card.text, CARD_W - 52);
  flav.forEach((line, i) => ctx.fillText(line, CARD_W / 2, 356 + i * 19));

  return canvas;
}

/** Paint the shared card back: deep red, gold frame, ember emblem. */
export function makeCardBack() {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7a1a12';
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 22);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#c9a227';
  roundRect(ctx, 8, 8, CARD_W - 16, CARD_H - 16, 18);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e8c85a';
  roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 12);
  ctx.stroke();
  // Ember emblem: concentric rings + flame.
  ctx.strokeStyle = '#e8c85a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(CARD_W / 2, CARD_H / 2 - 10, 74, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(CARD_W / 2, CARD_H / 2 - 10, 52, 0, Math.PI * 2); ctx.stroke();
  drawGlyph(ctx, 'flame', CARD_W / 2, CARD_H / 2 - 10, 72, '#ffd75e');
  ctx.fillStyle = '#e8c85a';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMBER COURT', CARD_W / 2, CARD_H - 52);
  return canvas;
}
