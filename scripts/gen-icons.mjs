// Génère les icônes PNG (sans dépendance) : anneau corail 3/4 sur fond noir.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [17, 17, 17], TRACK = [58, 58, 58], CORAL = [240, 83, 61];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// Couleur d'un point (coordonnées normalisées sur 512).
function colorAt(x, y) {
  const dx = x - 256, dy = y - 256;
  const r = Math.hypot(dx, dy);
  const R = 150, W = 28;
  // angle depuis le haut, sens horaire, en degrés
  const a = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const inArc = a <= 270;
  const capTop = Math.hypot(x - 256, y - 106) <= W;
  const capLeft = Math.hypot(x - 106, y - 256) <= W;
  if (capTop || capLeft) return CORAL;
  if (Math.abs(r - R) <= W) return inArc ? CORAL : TRACK;
  return BG;
}

function png(size) {
  const SS = 4, raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt(((px + (sx + 0.5) / SS) / size) * 512, ((py + (sy + 0.5) / SS) / size) * 512);
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      const o = py * (size * 3 + 1) + 1 + px * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size));
  console.log('écrit', name);
}
