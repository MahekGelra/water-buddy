const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Water-drop shape in a 0..1 box: a circle plus a pointed top (convex hull of circle and tip)
const CX = 0.5, CY = 0.64, R = 0.26, TY = 0.08;
const D = CY - TY;
const L = Math.sqrt(D * D - R * R);
const TAN = R / L;
const ALONG_MAX = (L * L) / D;
function inDrop(x, y) {
  if ((x - CX) ** 2 + (y - CY) ** 2 <= R * R) return true;
  const along = y - TY;
  return along >= 0 && along <= ALONG_MAX && Math.abs(x - CX) <= along * TAN;
}

function render(size, colorAt) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let cov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (inDrop(x, y)) cov++;
        }
      }
      const i = (py * size + px) * 4;
      const [r, g, b] = colorAt((px + 0.5) / size, (py + 0.5) / size);
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
      buf[i + 3] = Math.round((cov / (SS * SS)) * 255);
    }
  }
  return encodePNG(size, size, buf);
}

const black = () => [0, 0, 0];
const blue = (x, y) => {
  const t = Math.min(1, Math.max(0, (y - 0.08) / 0.82));
  let c = [
    125 + (37 - 125) * t,
    211 + (99 - 211) * t,
    252 + (235 - 252) * t,
  ];
  const d = Math.hypot(x - 0.4, y - 0.62);
  if (d < 0.07) c = c.map((v) => v + (255 - v) * 0.55);
  return c.map(Math.round);
};

const out = path.join(__dirname, 'assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'trayTemplate.png'), render(18, black));
fs.writeFileSync(path.join(out, 'trayTemplate@2x.png'), render(36, black));
fs.writeFileSync(path.join(out, 'icon.png'), render(1024, blue));
console.log('Icons written to assets/');