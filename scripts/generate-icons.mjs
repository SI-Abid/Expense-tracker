// Generates the PWA PNG icons with no external dependencies.
// Solid household-teal rounded background with a white "৳"-style emblem mark.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");
mkdirSync(PUBLIC, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(size) {
  const teal = [15, 118, 110];
  const white = [255, 255, 255];
  const r = size / 2;
  // raw RGBA scanlines, each prefixed with a 0 filter byte
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - r + 0.5, dy = y - r + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // white ring + center bar to suggest a coin / Taka mark
      const inRing = dist > size * 0.20 && dist < size * 0.30;
      const inBar = Math.abs(dx) < size * 0.05 && Math.abs(dy) < size * 0.30;
      const top = dy < -size * 0.12 && Math.abs(dy + size * 0.18) < size * 0.05 && Math.abs(dx) < size * 0.18;
      const c = inRing || inBar || top ? white : teal;
      const o = y * stride + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(resolve(PUBLIC, "icon-192.png"), makePNG(192));
writeFileSync(resolve(PUBLIC, "icon-512.png"), makePNG(512));
console.log("Wrote public/icon-192.png and public/icon-512.png");
