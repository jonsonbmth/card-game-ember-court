// The 3D Ember Court: a bright casino hall with a felt table, a
// dealer and a rival duchess seated across from you, and real 3D
// cards that slide across the table. Perspective camera, angled down
// the table so the scene reads as 3D at a glance. three.js r186 is
// loaded as a classic script (window.THREE) from game/vendor/.
import { makeCardFace, makeCardBack, CARD_W, CARD_H } from './cards.js';

const CARD_SCALE = 0.0082; // canvas px -> world units (256px ≈ 2.1u wide)
const CARD_WU = CARD_W * CARD_SCALE; // ≈ 2.51
const CARD_HU = CARD_H * CARD_SCALE; // ≈ 3.76

let renderer, scene, camera, clock;
let playerHandGroup, foeHandGroup, playGroup, fxGroup;
let playerMeshes = new Map(); // uid -> card group
let foeMeshes = [];
let playedMeshes = [];
let tweens = [];
let particles = null;
let particleVel = [];
let mara, odo, dust;
let cardFaceCache = new Map();
let cardBackTex = null;
let canvasEl = null;

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function woodFloorTexture() {
  return makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8a5a28'; ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const shade = 138 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${shade + 20}, ${Math.floor(shade * 0.62)}, 34)`;
        ctx.fillRect(col * 128 + (row % 2) * 64 - 64, row * 64, 126, 62);
        ctx.strokeStyle = 'rgba(60,30,5,0.55)'; ctx.lineWidth = 2;
        ctx.strokeRect(col * 128 + (row % 2) * 64 - 64, row * 64, 126, 62);
        ctx.strokeStyle = 'rgba(255,220,150,0.10)';
        for (let g = 0; g < 5; g += 1) {
          ctx.beginPath();
          const y = row * 64 + 8 + g * 10;
          ctx.moveTo(col * 128 + (row % 2) * 64 - 60, y);
          ctx.bezierCurveTo(w / 2, y + 3, w / 2, y - 3, col * 128 + (row % 2) * 64 + 60, y);
          ctx.stroke();
        }
      }
    }
  });
}

function feltTexture() {
  return makeCanvas(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#1d6b34'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i += 1) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = 'rgba(201,162,39,0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.fillStyle = 'rgba(255,215,94,0.16)';
    ctx.font = 'bold 44px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('EMBER COURT', w / 2, h / 2 + 8);
  });
}

function skyTexture() {
  return makeCanvas(256, 384, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3f8fe0'); g.addColorStop(0.55, '#7ec3f2'); g.addColorStop(1, '#ffe9b0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.22, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const cloud = (x, y, s) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 42 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26 * s, y + 4 * s, 30 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 26 * s, y + 5 * s, 28 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    cloud(w * 0.3, h * 0.3, 1); cloud(w * 0.68, h * 0.48, 0.8); cloud(w * 0.25, h * 0.62, 0.9);
    ctx.fillStyle = '#2f7a3d';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.94);
    ctx.lineTo(w * 0.4, h * 0.88); ctx.lineTo(w * 0.7, h * 0.92); ctx.lineTo(w, h * 0.88); ctx.lineTo(w, h); ctx.fill();
  });
}

function paintingTexture(hue) {
  return makeCanvas(256, 192, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `hsl(${hue}, 55%, 62%)`); g.addColorStop(1, `hsl(${hue + 30}, 60%, 82%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `hsl(${hue + 80}, 45%, 32%)`;
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w * 0.3, h * 0.45); ctx.lineTo(w * 0.6, h); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.85, h * 0.55); ctx.lineTo(w, h); ctx.fill();
  });
}

function faceTexture({ brow = '#3a2410', iris = '#4a2c12', lips = '#b04a3a', blush = 'rgba(255,120,110,0.35)' } = {}) {
  return makeCanvas(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    // Brows.
    ctx.strokeStyle = brow; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(62, 96); ctx.quadraticCurveTo(84, 84, 108, 94); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(148, 94); ctx.quadraticCurveTo(172, 84, 194, 96); ctx.stroke();
    // Eyes.
    const eye = (x, y) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x, y, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    };
    eye(85, 112); eye(171, 112);
    // Nose.
    ctx.strokeStyle = 'rgba(120,70,40,0.6)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(128, 122); ctx.quadraticCurveTo(124, 148, 120, 156); ctx.stroke();
    // Smile.
    ctx.strokeStyle = lips; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(104, 178); ctx.quadraticCurveTo(128, 196, 152, 178); ctx.stroke();
    // Blush.
    ctx.fillStyle = blush;
    ctx.beginPath(); ctx.ellipse(66, 152, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(190, 152, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
  });
}

function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}

function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, opts));
  return m;
}

function cyl(rt, rb, h, color, opts, seg = 20) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material(color, opts));
}

function sphere(r, color, opts, wSeg = 20, hSeg = 16) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, wSeg, hSeg), material(color, opts));
}

function add(parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

/** Build one seated/standing person from primitives, with a face plate. */
function makePerson({ skin = '#e8b98a', hair = '#3a2410', shirt = '#7b4fd0', pants = '#2c2333', robe = false, crown = false, hat = false }) {
  const g = new THREE.Group();
  // Chair (seated) or legs (standing) are added by the caller via g.userData.
  const torso = robe
    ? cyl(0.42, 0.62, 1.5, shirt, { roughness: 0.7 })
    : box(0.78, 0.95, 0.42, shirt);
  add(g, torso, 0, 0.95, 0);
  // Arms reaching toward the table, tucked close to the body.
  const armL = cyl(0.09, 0.08, 0.85, shirt);
  add(g, armL, -0.48, 1.05, 0.1, -0.55, 0, 0.25);
  const armR = cyl(0.09, 0.08, 0.85, shirt);
  add(g, armR, 0.48, 1.05, 0.1, -0.55, 0, -0.25);
  add(g, sphere(0.09, skin), -0.55, 0.78, 0.3);
  add(g, sphere(0.09, skin), 0.55, 0.78, 0.3);
  // Head + hair + face.
  const head = sphere(0.34, skin);
  add(g, head, 0, 1.78, 0);
  const hairCap = sphere(0.36, hair, { roughness: 0.9 });
  hairCap.scale.set(1, 0.75, 1);
  add(g, hairCap, 0, 1.92, -0.05);
  if (robe) { // long hair down the back
    const back = box(0.5, 0.7, 0.16, hair);
    add(g, back, 0, 1.55, -0.3);
  }
  if (crown) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 24), material('#e0a92e', { metalness: 0.8, roughness: 0.3 }));
    add(g, ring, 0, 2.06, 0, Math.PI / 2 - 0.15, 0, 0);
    for (let i = 0; i < 5; i += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), material('#e0a92e', { metalness: 0.8, roughness: 0.3 }));
      const a = (i / 5) * Math.PI * 2;
      add(g, spike, Math.cos(a) * 0.3, 2.14, Math.sin(a) * 0.3);
    }
  }
  if (hat) {
    const brim = cyl(0.42, 0.42, 0.05, '#1d3a5e');
    add(g, brim, 0, 2.06, 0);
    add(g, cyl(0.26, 0.3, 0.22, '#1d3a5e'), 0, 2.18, 0);
  }
  const faceTex = faceTexture({ brow: hair });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.52),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }),
  );
  // Just outside the head sphere (radius 0.34) so the eyes are visible.
  add(g, face, 0, 1.76, 0.36);
  g.userData.head = head;
  g.userData.face = face;
  return g;
}

function buildRoom() {
  const room = new THREE.Group();
  // Floor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), new THREE.MeshStandardMaterial({ map: woodFloorTexture(), roughness: 0.8 }));
  add(room, floor, 0, 0, 0, -Math.PI / 2);
  floor.material.map.wrapS = THREE.RepeatWrapping;
  floor.material.map.wrapT = THREE.RepeatWrapping;
  floor.material.map.repeat.set(3, 2.5);
  // Back wall + side walls.
  const wallMat = material('#e8d3a8', { roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(44, 13), wallMat);
  add(room, back, 0, 6.5, -11);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(34, 13), material('#dcc79b', { roughness: 0.95 }));
  add(room, left, -13, 6.5, 0, 0, Math.PI / 2);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(34, 13), material('#dcc79b', { roughness: 0.95 }));
  add(room, right, 13, 6.5, 0, 0, -Math.PI / 2);
  // Windows with blue sky on the back wall.
  const skyTex = skyTexture();
  for (const wx of [-7.5, 0, 7.5]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7.2), new THREE.MeshBasicMaterial({ map: skyTex }));
    add(room, win, wx, 5.2, -10.9);
    const frame = box(4.8, 7.6, 0.18, '#5a3a14');
    add(room, frame, wx, 5.2, -11.0);
    frame.material = material('#5a3a14');
    // Move the frame behind the sky pane by re-adding: simpler — frame as border boxes.
    room.remove(frame);
    const border = (bw, bh, bx, by) => add(room, box(bw, bh, 0.16, '#5a3a14'), bx, by, -10.95);
    border(4.8, 0.3, wx, 5.2 + 3.75);
    border(4.8, 0.3, wx, 5.2 - 3.75);
    border(0.3, 7.8, wx - 2.4, 5.2);
    border(0.3, 7.8, wx + 2.4, 5.2);
    border(0.16, 7.2, wx, 5.2);
    border(4.4, 0.16, wx, 5.2);
    const sill = box(5.2, 0.24, 0.5, '#7a5220');
    add(room, sill, wx, 1.45, -10.8);
  }
  // Paintings between windows.
  for (const [px, hue] of [[-3.7, 200], [3.7, 30]]) {
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshBasicMaterial({ map: paintingTexture(hue) }));
    add(room, pic, px, 5.6, -10.9);
    add(room, box(2.9, 2.2, 0.1, '#6a4a1a'), px, 5.6, -11.0);
    room.children[room.children.length - 1].position.z = -10.98;
  }
  // Wall lamps.
  for (const lx of [-11, -3.7, 3.7, 11]) {
    const lamp = sphere(0.22, '#ffd75e', { emissive: '#ffbf40', emissiveIntensity: 1.6 });
    add(room, lamp, lx, 4.4, -10.8);
    add(room, cyl(0.06, 0.1, 0.5, '#3a2a10'), lx, 4.0, -10.85);
  }
  // Red carpet runner toward the table.
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 16), material('#a02020', { roughness: 1 }));
  add(room, carpet, 0, 0.02, 9.5, -Math.PI / 2);
  const carpetEdge = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 16), new THREE.MeshBasicMaterial({ color: '#c9a227', transparent: true, opacity: 0.0 }));
  room.add(carpetEdge);
  // Chandeliers.
  for (const cx of [-5, 5]) {
    const ch = new THREE.Group();
    add(ch, cyl(0.04, 0.04, 2.2, '#3a2a10'), 0, 1.1, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 10, 28), material('#c9a227', { metalness: 0.7, roughness: 0.35 }));
    add(ch, ring, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const bulb = sphere(0.13, '#ffe9a8', { emissive: '#ffcf5e', emissiveIntensity: 2 });
      add(ch, bulb, Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9);
    }
    ch.position.set(cx, 8.6, -2);
    room.add(ch);
  }
  // Potted plants in the corners.
  for (const [px, pz] of [[-10.5, -8.5], [10.5, -8.5]]) {
    const pot = cyl(0.5, 0.38, 0.8, '#9a4a20');
    add(room, pot, px, 0.4, pz);
    for (let i = 0; i < 5; i += 1) {
      const leaf = sphere(0.42, '#2f7a3d', { roughness: 1 });
      leaf.scale.set(1, 1.6, 1);
      add(room, leaf, px + (Math.random() - 0.5) * 0.5, 1.3 + Math.random() * 0.5, pz + (Math.random() - 0.5) * 0.5);
    }
  }
  return room;
}

function buildTable() {
  const table = new THREE.Group();
  // Wood body + green felt top with gold trim.
  add(table, box(10.5, 0.5, 6.4, '#5a3a14', { roughness: 0.6 }), 0, 1.05, 0);
  const felt = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.14, 5.8), new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.95 }));
  add(table, felt, 0, 1.34, 0);
  // Gold rim.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 4), material('#c9a227', { metalness: 0.7, roughness: 0.3 }));
  table.add(rim);
  rim.visible = false;
  // Legs.
  for (const [lx, lz] of [[-4.6, -2.6], [4.6, -2.6], [-4.6, 2.6], [4.6, 2.6]]) {
    add(table, cyl(0.22, 0.3, 0.85, '#4a2e0e'), lx, 0.42, lz);
  }
  // Candles on the table.
  for (const [cx, cz] of [[-4.2, -1.6], [4.2, -1.6]]) {
    add(table, cyl(0.09, 0.11, 0.5, '#f7ecd2'), cx, 1.65, cz);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 10), new THREE.MeshBasicMaterial({ color: '#ffb13c' }));
    add(table, flame, cx, 2.0, cz);
  }
  // Chip stacks and coins.
  const chipColors = ['#f2f2f2', '#d43a2e', '#2f7fe0', '#e0a92e'];
  for (let s = 0; s < 4; s += 1) {
    const sx = -4.0 + s * 0.55;
    const sz = s % 2 === 0 ? 2.2 : 1.9;
    for (let i = 0; i < 5; i += 1) {
      add(table, cyl(0.22, 0.22, 0.07, chipColors[(s + i) % 4], { roughness: 0.5 }), sx, 1.48 + i * 0.075, sz);
    }
  }
  for (let i = 0; i < 14; i += 1) {
    const coin = cyl(0.14, 0.14, 0.04, '#e0a92e', { metalness: 0.8, roughness: 0.3 });
    add(table, coin, 3.4 + Math.random() * 1.2, 1.44, -2.2 + Math.random() * 1.4);
  }
  return table;
}

function buildCharacters() {
  const group = new THREE.Group();
  // Mara, seated across the table, facing the camera — big enough
  // to read at thumbnail size: crown, face and violet robe.
  mara = makePerson({ skin: '#f0c49a', hair: '#6a1a12', shirt: '#7b4fd0', robe: true, crown: true });
  mara.position.set(0, 0, -4.8);
  mara.scale.setScalar(1.5);
  mara.rotation.y = 0;
  // Chair for Mara.
  const chair = new THREE.Group();
  add(chair, box(1.3, 0.18, 1.1, '#4a2e0e'), 0, 0.55, 0);
  add(chair, box(1.3, 1.5, 0.16, '#4a2e0e'), 0, 1.3, -0.5);
  add(chair, box(0.16, 0.55, 1.1, '#4a2e0e'), -0.6, 0.28, 0);
  add(chair, box(0.16, 0.55, 1.1, '#4a2e0e'), 0.6, 0.28, 0);
  chair.position.set(0, 0, -5.35);
  group.add(chair);
  group.add(mara);

  // Odo the dealer, standing at the left end of the table.
  odo = makePerson({ skin: '#d9a06a', hair: '#8a8a8a', shirt: '#1d6b6b', pants: '#222', hat: false });
  odo.position.set(-5.9, 0, 0.6);
  odo.rotation.y = Math.PI / 2 - 0.35;
  // Dealer legs.
  const legL = cyl(0.11, 0.1, 0.95, '#222');
  add(odo, legL, -0.18, 0.48, 0);
  const legR = cyl(0.11, 0.1, 0.95, '#222');
  add(odo, legR, 0.18, 0.48, 0);
  // Bow tie.
  add(odo, box(0.3, 0.12, 0.06, '#c9a227'), 0, 1.48, 0.24);
  // Moustache.
  add(odo, box(0.24, 0.05, 0.04, '#5a3a1a'), 0, 1.66, 0.32);
  group.add(odo);

  // The player's hands resting at the near edge of the table.
  for (const side of [-1, 1]) {
    const hand = new THREE.Group();
    const palm = box(0.42, 0.14, 0.6, '#e8b98a');
    add(hand, palm, 0, 0, 0);
    for (let f = 0; f < 4; f += 1) {
      const finger = cyl(0.05, 0.045, 0.34, '#e8b98a');
      add(hand, finger, -0.15 + f * 0.1, 0, 0.42, Math.PI / 2 - 0.25, 0, 0);
    }
    const thumb = cyl(0.05, 0.045, 0.28, '#e8b98a');
    add(hand, thumb, side * 0.24, 0, 0.18, 0.5, 0, side * 0.9);
    hand.position.set(side * 4.9, 1.46, 3.3);
    hand.rotation.y = side * -0.2;
    group.add(hand);
  }
  return group;
}

function makeCardMesh(card, faceUp) {
  const group = new THREE.Group();
  let faceTex = cardFaceCache.get(card.id);
  if (!faceTex) {
    faceTex = new THREE.CanvasTexture(makeCardFace(card));
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = 4;
    cardFaceCache.set(card.id, faceTex);
  }
  if (!cardBackTex) {
    cardBackTex = new THREE.CanvasTexture(makeCardBack());
    cardBackTex.colorSpace = THREE.SRGBColorSpace;
    cardBackTex.anisotropy = 4;
  }
  const geo = new THREE.PlaneGeometry(CARD_WU, CARD_HU);
  const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: faceTex }));
  front.position.z = 0.012;
  const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cardBackTex }));
  back.position.z = -0.012;
  back.rotation.y = Math.PI;
  group.add(front);
  group.add(back);
  group.userData.front = front;
  group.userData.back = back;
  group.userData.card = card;
  group.userData.faceUp = faceUp;
  return group;
}

/** Fan positions for the player's hand, across the near table edge. */
export function handSlots(n) {
  const slots = [];
  const spread = Math.min(n, 7);
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    slots.push({
      pos: [t * 4.2, 2.2 + Math.abs(t) * 0.1, 3.9],
      rot: [-1.02, 0, -t * 0.14],
    });
  }
  return slots;
}

function foeSlots(n) {
  const slots = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    slots.push({
      pos: [t * 2.4, 1.66 + Math.abs(t) * 0.05, -2.95],
      // Leaning back past flat so the camera sees the card BACKS.
      rot: [-2.12, 0, t * 0.12],
    });
  }
  return slots;
}

export function initRenderer(canvas) {
  canvasEl = canvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2d8a0');
  scene.fog = new THREE.Fog('#f2d8a0', 26, 46);

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 9.4, 15.2);
  camera.lookAt(0, 0.2, -1.2);

  scene.add(new THREE.HemisphereLight('#cfe8ff', '#8a6a3a', 1.15));
  const sun = new THREE.DirectionalLight('#ffe6b0', 2.0);
  sun.position.set(6, 11, -7);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#ffffff', 0.55);
  fill.position.set(-4, 6, 9);
  scene.add(fill);
  const chandelierLight = new THREE.PointLight('#ffd98a', 30, 22, 1.6);
  chandelierLight.position.set(0, 7.6, -2);
  scene.add(chandelierLight);

  scene.add(buildRoom());
  scene.add(buildTable());
  scene.add(buildCharacters());

  playerHandGroup = new THREE.Group();
  foeHandGroup = new THREE.Group();
  playGroup = new THREE.Group();
  fxGroup = new THREE.Group();
  scene.add(playerHandGroup, foeHandGroup, playGroup, fxGroup);

  // Deck piles at the table corners: small stacked slabs that read
  // as card decks, not bricks.
  for (const [dx, dz] of [[4.35, 2.3], [-4.35, -2.3]]) {
    for (let i = 0; i < 8; i += 1) {
      const slab = box(CARD_WU * 0.62, 0.045, CARD_HU * 0.42, i % 2 ? '#7a1a12' : '#8a2a1a');
      add(scene, slab, dx, 1.44 + i * 0.05, dz, 0, 0.12 + (i % 3) * 0.02, 0);
      slab.rotation.x = 0;
    }
  }

  // Golden dust motes drifting in the light.
  const dustCount = 120;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = 0.5 + Math.random() * 8;
    positions[i * 3 + 2] = -8 + Math.random() * 14;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffe9a8', size: 0.07, transparent: true, opacity: 0.7 }));
  scene.add(dust);

  clock = new THREE.Clock();
  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/** Keep the 3D hand meshes in step with the game state. */
export function syncHands(state) {
  // Player hand: one mesh per card uid, fanned.
  const want = state.you.hand.map((c) => c.uid);
  for (const [uid, mesh] of [...playerMeshes]) {
    if (!want.includes(uid)) {
      playerHandGroup.remove(mesh);
      playerMeshes.delete(uid);
    }
  }
  const slots = handSlots(state.you.hand.length);
  state.you.hand.forEach((card, i) => {
    let mesh = playerMeshes.get(card.uid);
    if (!mesh) {
      mesh = makeCardMesh(card, true);
      mesh.position.set(slots[i].pos[0], slots[i].pos[1], slots[i].pos[2] + 3);
      mesh.rotation.set(...slots[i].rot);
      playerHandGroup.add(mesh);
      playerMeshes.set(card.uid, mesh);
    }
    mesh.userData.slot = slots[i];
    mesh.userData.card = card;
  });
  // Foe hand: face-down backs, count matches her hand size.
  while (foeMeshes.length > state.foe.hand.length) {
    foeHandGroup.remove(foeMeshes.pop());
  }
  const fslots = foeSlots(state.foe.hand.length);
  state.foe.hand.forEach((card, i) => {
    let mesh = foeMeshes[i];
    if (!mesh) {
      mesh = makeCardMesh(card, false);
      foeHandGroup.add(mesh);
      foeMeshes.push(mesh);
    }
    mesh.userData.slot = fslots[i];
    mesh.position.set(fslots[i].pos[0], fslots[i].pos[1], fslots[i].pos[2]);
    mesh.rotation.set(...fslots[i].rot);
  });
  // Ease hand cards toward their slots.
  for (const mesh of playerMeshes.values()) {
    const s = mesh.userData.slot;
    if (!s || mesh.userData.flying) continue;
    mesh.position.x += (s.pos[0] - mesh.position.x) * 0.14;
    mesh.position.y += (s.pos[1] - mesh.position.y) * 0.14;
    mesh.position.z += (s.pos[2] - mesh.position.z) * 0.14;
    mesh.rotation.z += (s.rot[2] - mesh.rotation.z) * 0.14;
    mesh.rotation.x += (s.rot[0] - mesh.rotation.x) * 0.14;
  }
}

/** Slide a played card to the centre of the table, then to the discard pile. */
export function animatePlay(uid, side, onDone) {
  const mesh = side === 'you' ? playerMeshes.get(uid) : null;
  if (!mesh) { onDone && onDone(); return; }
  mesh.userData.flying = true;
  const start = mesh.position.clone();
  const startRot = mesh.rotation.clone();
  const mid = new THREE.Vector3(side === 'you' ? -0.4 : 0.4, 3.4, 0.2);
  const end = new THREE.Vector3(side === 'you' ? -1.4 : 1.4, 1.62, 0.1);
  const t0 = performance.now();
  const dur = 650;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    const arc = Math.sin(k * Math.PI) * 1.2;
    mesh.position.lerpVectors(start, end, e);
    mesh.position.y += arc;
    mesh.rotation.x = startRot.x + (-1.45 - startRot.x) * e;
    mesh.rotation.z = startRot.z * (1 - e);
    if (k < 1) { requestAnimationFrame(step); return; }
    mesh.userData.flying = false;
    playerHandGroup.remove(mesh);
    playerMeshes.delete(uid);
    playGroup.add(mesh);
    playedMeshes.push(mesh);
    if (playedMeshes.length > 6) {
      const old = playedMeshes.shift();
      playGroup.remove(old);
    }
    // Nudge the played pile into a neat stack.
    playedMeshes.forEach((m, i) => {
      m.position.set(-1.4 + (i % 3) * 0.35, 1.62 + Math.floor(i / 3) * 0.03, 0.1 + Math.floor(i / 3) * 0.3);
      m.rotation.set(-1.45, 0, (i % 3 - 1) * 0.06);
    });
    onDone && onDone();
  };
  step();
}

/** A golden burst over the table for the win. */
export function winBurst() {
  const count = 260;
  const positions = new Float32Array(count * 3);
  particleVel = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = 1.8 + Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    particleVel.push([Math.cos(a) * sp, 2.5 + Math.random() * 4.5, Math.sin(a) * sp]);
  }
  if (particles) fxGroup.remove(particles);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd75e', size: 0.16, transparent: true, opacity: 1 }));
  fxGroup.add(particles);
}

/** One frame: idle motion, tweens, particles, dust, render. */
export function renderFrame(dt) {
  const t = clock.getElapsedTime();
  // Gentle idle life: Mara and Odo breathe, camera sways a hair.
  if (mara) {
    mara.position.y = Math.sin(t * 1.1) * 0.02;
    mara.rotation.z = Math.sin(t * 0.7) * 0.012;
    mara.userData.head.rotation.y = Math.sin(t * 0.4) * 0.18;
  }
  if (odo) {
    odo.position.y = Math.sin(t * 1.3 + 2) * 0.015;
    odo.rotation.y = Math.PI / 2 - 0.35 + Math.sin(t * 0.3) * 0.06;
  }
  camera.position.x = Math.sin(t * 0.12) * 0.22;
  camera.lookAt(0, 0.2, -1.2);
  if (dust) {
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.25) * 0.15;
  }
  if (particles) {
    const pos = particles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const v = particleVel[i];
      v[1] -= 5.5 * dt;
      pos.array[i * 3] += v[0] * dt;
      pos.array[i * 3 + 1] += v[1] * dt;
      pos.array[i * 3 + 2] += v[2] * dt;
      if (pos.array[i * 3 + 1] < 1.45) { pos.array[i * 3 + 1] = 1.45; v[1] = 0; v[0] *= 0.9; v[2] *= 0.9; }
    }
    pos.needsUpdate = true;
    particles.material.opacity = Math.max(0, particles.material.opacity - dt * 0.45);
  }
  renderer.render(scene, camera);
}

/** Raycast the player's hand: which card (index) sits under screen point? */
export function pickPlayerCard(clientX, clientY) {
  if (!renderer) return -1;
  const rect = canvasEl.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
  const meshes = [...playerMeshes.values()];
  const hits = ray.intersectObjects(meshes, true);
  if (!hits.length) return -1;
  let obj = hits[0].object;
  while (obj && !obj.userData.card) obj = obj.parent;
  if (!obj) return -1;
  const uid = obj.userData.card.uid;
  const order = [...playerMeshes.keys()];
  return order.indexOf(uid);
}

export function frameSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}
