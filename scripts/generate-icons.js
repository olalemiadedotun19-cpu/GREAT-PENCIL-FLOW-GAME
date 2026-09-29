import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b, isMaskable = false) {
  // Construct a minimal uncompressed/deflated valid PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * (isMaskable ? 0.35 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background warm paper #f5f0e6
      let pr = 245, pg = 240, pb = 230;

      // Outer circle (ball outline)
      if (dist < outerR) {
        if (dist > outerR - 6) {
          // Dark graphite #2b2723
          pr = 43; pg = 39; pb = 35;
        } else if (dist < outerR * 0.4) {
          // Center core / highlight #e07272 (pencil eraser) or #dfab34
          pr = 224; pg = 114; pb = 114;
        } else {
          // Ball interior #fdfbf7
          pr = 253; pg = 251; pb = 247;
        }
      }

      rawData[pxOffset] = pr;
      rawData[pxOffset + 1] = pg;
      rawData[pxOffset + 2] = pb;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, 245, 240, 230, false));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, 245, 240, 230, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, 245, 240, 230, true));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, 245, 240, 230, false));
console.log('Successfully generated PWA icon PNGs in public/');
