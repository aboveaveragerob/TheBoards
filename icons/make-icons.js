/* Regenerates the three app icons from the settled v2 tokens (B1's motif,
 * re-drawn as B48 orders — the way B16 regenerated it under B1).
 *
 * The motif is unchanged from B1: a near-square note-frame with two "text"
 * lines and a short scratch stroke — identity from structure, not costume
 * (UIUX §1). What moves is the tokens it is drawn in: the note is #a0d4da
 * behind its #031019 ink frame (B49), and it sits on the field's own fall
 * (UIUX §2.8) — on the water, the note is the brightest thing there is
 * (B46). The maskable variant keeps the motif inside the ~80% safe zone
 * with the water bleeding to the edges.
 *
 * Dependency-free (node:zlib), like everything else in this repository:
 *   node icons/make-icons.js [--ground=water|sky] [--out=DIR]
 * Writes icon-192.png, icon-512.png, icon-512-maskable.png beside itself.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GROUND = (process.argv.find(a => a.startsWith('--ground=')) || '--ground=water').slice(9);
const OUT = (process.argv.find(a => a.startsWith('--out=')) || ('--out=' + __dirname)).slice(6);

/* ---- The settled tokens (UIUX §2) ---------------------------------------- */
const INK = [0x03, 0x10, 0x19];                 // --ink-dark
const NOTE = [0xa0, 0xd4, 0xda];                // --note
const SKY = [0x02, 0x08, 0x12];                 // --band / --chrome
const FALL = [                                  // the field's three stops (§2.8)
  { at: 0.00, c: [0x34, 0x69, 0x7f] },
  { at: 0.46, c: [0x25, 0x52, 0x65] },
  { at: 1.00, c: [0x16, 0x36, 0x46] },
];

const lerp = (a, b, t) => a + (b - a) * t;
function fallAt(t) {
  let lo = FALL[0], hi = FALL[FALL.length - 1];
  for (let i = 0; i + 1 < FALL.length; i++) {
    if (t >= FALL[i].at && t <= FALL[i + 1].at) { lo = FALL[i]; hi = FALL[i + 1]; break; }
  }
  const k = hi.at === lo.at ? 0 : (t - lo.at) / (hi.at - lo.at);
  return [0, 1, 2].map(i => lerp(lo.c[i], hi.c[i], k));
}

/* ---- A tiny signed-distance rasterizer, supersampled 4x ------------------ */
function render(size, maskable) {
  const SS = 4, S = size * SS;
  const px = new Float64Array(S * S * 3);

  // The ground: the vertical fall, edge to edge (flat sky for the alternative).
  for (let y = 0; y < S; y++) {
    const c = GROUND === 'sky' ? SKY : fallAt(y / (S - 1));
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }

  // B1's proportions on a 512 canvas, scaled; the maskable motif sits at 62%.
  const k = (size / 512) * SS * (maskable ? 0.62 : 1);
  const cx = S / 2, cy = S / 2;
  const at = (x, y) => [cx + (x - 256) * k, cy + (y - 256) * k];

  // Note frame: fill + ink border, radius = the border width — the marks' own
  // radius-to-stroke hand (UIUX §13.3).
  const BW = 28 * k, R = 28 * k;
  const [fx0, fy0] = at(75, 75), [fx1, fy1] = at(437, 437);

  const roundDist = (x, y, x0, y0, x1, y1, r) => {
    const qx = Math.max(x0 + r - x, 0, x - (x1 - r));
    const qy = Math.max(y0 + r - y, 0, y - (y1 - r));
    return Math.hypot(qx, qy) - r;
  };
  const segDist = (x, y, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
  };

  // The two text lines and the scratch stroke, in ink (B1's motif).
  const bars = [
    [at(160, 211), at(352, 211), 14 * k],       // first line
    [at(160, 275), at(290, 275), 14 * k],       // second, shorter
    [at(152, 322), at(282, 378), 15 * k],       // the completion stroke, angled
  ];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 3;
      const d = roundDist(x, y, fx0, fy0, fx1, fy1, R);
      let c = null;
      if (d <= -BW) c = NOTE;                   // inside the frame: the note's fill
      else if (d <= 0) c = INK;                 // the frame itself
      if (c && d <= -BW) {
        for (const [[ax, ay], [bx, by], w] of bars) {
          if (segDist(x, y, ax, ay, bx, by) <= w) { c = INK; break; }
        }
      }
      if (c) { px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; }
    }
  }

  // Box-downsample to the target size.
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * S + (x * SS + sx)) * 3;
          r += px[o]; g += px[o + 1]; b += px[o + 2];
        }
      }
      const o = (y * size + x) * 4;
      rgba[o] = Math.round(r / (SS * SS));
      rgba[o + 1] = Math.round(g / (SS * SS));
      rgba[o + 2] = Math.round(b / (SS * SS));
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

/* ---- Minimal PNG writer (8-bit RGBA, filter 0) --------------------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;                     // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
]) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, png(size, render(size, maskable)));
  console.log('wrote', file, GROUND);
}
