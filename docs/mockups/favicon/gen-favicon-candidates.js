/* Favicon candidates for issue #148 item 6 — real rasterized PNGs at true
 * 16/32/48px, generated with the same dependency-free SDF rasterizer as
 * icons/make-icons.js (node:zlib only). Tokens are the settled ones (UIUX §2):
 *   INK  #031019   NOTE #a0d4da   DEEP #020812   WATER #34697f→#255265→#163646
 *
 * Directions (each a different first principle, per the design law "identity
 * from structure, not costume", UIUX §1):
 *   A  skeleton  — B1's frame, water ground, NO text bars: the frame + the
 *                  completion stroke alone. Tests whether the bars were the
 *                  mud at 16px.
 *   B  the-stroke— the tile IS the note (fill edge to edge), one ink
 *                  completion stroke across it. The app's own mark, minimal.
 *   C  deep-chip — deep ground, a small note chip with one bar + stroke:
 *                  the tab-favicon idiom (icon floats on chrome dark).
 *   D  b1-water  — B1's exact motif on the water fall (make-icons.js's flag
 *                  alternative), for small-size comparison.
 *   current      — icon-192.png downscaled, the shipped state.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, 'favicon');
fs.mkdirSync(OUT, { recursive: true });

const INK = [0x03, 0x10, 0x19];
const NOTE = [0xa0, 0xd4, 0xda];
const DEEP = [0x02, 0x08, 0x12];
const FALL = [
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

/* Each candidate draws on a normalized 512-canvas via (x,y) in [0,512]. */
const CANDIDATES = {
  'a-skeleton': (x, y) => {
    const d = roundDist(x, y, 75, 75, 437, 437, 28);
    let c = null;
    if (d <= -28) c = NOTE;         // frame fill, no text bars
    else if (d <= 0) c = INK;       // the frame
    if (c && d <= -28 && segDist(x, y, 152, 322, 282, 378) <= 15) c = INK;
    return c;
  },
  'b-the-stroke': (x, y) => {
    // The tile is the note; one ink completion stroke, angled as in B1.
    if (segDist(x, y, 140, 330, 300, 390) <= 26) return INK;
    return NOTE;
  },
  'c-deep-chip': (x, y) => {
    const d = roundDist(x, y, 128, 128, 384, 384, 20);
    let c = null;
    if (d <= -18) c = NOTE;
    else if (d <= 0) c = INK;
    if (c && d <= -18) {
      if (segDist(x, y, 176, 220, 336, 220) <= 12) c = INK;
      if (segDist(x, y, 168, 300, 268, 340) <= 13) c = INK;
    }
    return c;
  },
  'd-b1-water': (x, y) => {
    const d = roundDist(x, y, 75, 75, 437, 437, 28);
    let c = null;
    if (d <= -28) c = NOTE;
    else if (d <= 0) c = INK;
    if (c && d <= -28) {
      if (segDist(x, y, 160, 211, 352, 211) <= 14) c = INK;
      if (segDist(x, y, 160, 275, 290, 275) <= 14) c = INK;
      if (segDist(x, y, 152, 322, 282, 378) <= 15) c = INK;
    }
    return c;
  },
};

function roundDist(x, y, x0, y0, x1, y1, r) {
  const qx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const qy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return Math.hypot(qx, qy) - r;
}
function segDist(x, y, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
}

const SIZES = [16, 32, 48];
const SS = 8; // heavy supersampling — 16px output is exactly where mud lives

function render(name, size) {
  const S = size * SS;
  const k = size / 512;
  const px = new Float64Array(S * S * 3);
  const ground = name === 'c-deep-chip' ? DEEP : null;
  for (let Y = 0; Y < S; Y++) {
    const g = name === 'd-b1-water' ? fallAt(Y / (S - 1)) : ground || DEEP;
    for (let X = 0; X < S; X++) {
      // The supersample pixel's center maps to the 512-canvas like this:
      // output pixel = X/SS; canvas = output * (512/size); + half-step.
      const x = (X + 0.5) / (SS * k);
      const y = (Y + 0.5) / (SS * k);
      const c = CANDIDATES[name](x, y) || g;
      const o = (Y * S + X) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
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

/* ---- PNG writer (identical to make-icons.js) ---------------------------- */
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
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const name of Object.keys(CANDIDATES)) {
  for (const size of SIZES) {
    const file = path.join(OUT, `${name}-${size}.png`);
    fs.writeFileSync(file, png(size, render(name, size)));
    console.log('wrote', file);
  }
}
console.log('done');
