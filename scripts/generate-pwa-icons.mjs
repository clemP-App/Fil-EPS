import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PINE = [15, 118, 110];
const MARK = [255, 255, 255];

const STEM = [9.2, 23.6, 9.2, 8.4];
const TOP = [9.2, 8.4, 22.8, 8.4];
const MID = [9.2, 15.6, 18.6, 15.6];
const STROKE = 3.4;
const VIEW = 32;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 4 + 1);
    raw[start] = 0;
    rgba.copy(raw, start + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map((image) => {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function insideRoundRect(px, py, radius) {
  const inset = VIEW / 2 - radius;
  const dx = Math.abs(px - VIEW / 2) - inset;
  const dy = Math.abs(py - VIEW / 2) - inset;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius <= 0;
}

function render(size, mode) {
  const rounded = mode === "favicon";
  const glyphScale = mode === "maskable" ? 0.84 : 1;
  const samples = size <= 48 ? 8 : 4;
  const rgba = Buffer.alloc(size * size * 4);
  const radius = STROKE / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let covered = 0;
      const total = samples * samples;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = ((x + (sx + 0.5) / samples) / size) * VIEW;
          const py = ((y + (sy + 0.5) / samples) / size) * VIEW;
          if (rounded && !insideRoundRect(px, py, 7)) continue;
          const gx = VIEW / 2 + (px - VIEW / 2) / glyphScale;
          const gy = VIEW / 2 + (py - VIEW / 2) / glyphScale;
          const onMark =
            distanceToSegment(gx, gy, ...STEM) <= radius ||
            distanceToSegment(gx, gy, ...TOP) <= radius ||
            distanceToSegment(gx, gy, ...MID) <= radius;
          const color = onMark ? MARK : PINE;
          red += color[0];
          green += color[1];
          blue += color[2];
          covered += 1;
        }
      }
      const index = (y * size + x) * 4;
      rgba[index] = covered ? Math.round(red / covered) : 0;
      rgba[index + 1] = covered ? Math.round(green / covered) : 0;
      rgba[index + 2] = covered ? Math.round(blue / covered) : 0;
      rgba[index + 3] = Math.round((covered / total) * 255);
    }
  }
  return rgba;
}

function writePng(path, size, mode) {
  mkdirSync(dirname(path), { recursive: true });
  const png = encodePng(size, size, render(size, mode));
  writeFileSync(path, png);
  return png;
}

const icon192 = writePng(join(root, "public/icons/icon-192.png"), 192, "any");
const icon512 = writePng(join(root, "public/icons/icon-512.png"), 512, "any");
writePng(join(root, "public/icons/icon-maskable-192.png"), 192, "maskable");
writePng(join(root, "public/icons/icon-maskable-512.png"), 512, "maskable");
writePng(join(root, "public/apple-touch-icon.png"), 180, "any");
const favicon16 = encodePng(16, 16, render(16, "favicon"));
const favicon32 = encodePng(32, 32, render(32, "favicon"));
writeFileSync(join(root, "public/favicon.ico"), ico([
  { size: 16, png: favicon16 },
  { size: 32, png: favicon32 },
]));
writeFileSync(
  join(root, "public/icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0f766e"/>
  <path d="M9.2 23.6V8.4H22.8M9.2 15.6H18.6" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
);

function dimensions(png) {
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

console.log(`icon-192 ${dimensions(icon192)}`);
console.log(`icon-512 ${dimensions(icon512)}`);
console.log("favicon.ico, apple-touch-icon.png, maskable icons, icon.svg");
