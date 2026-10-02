/**
 * Pure Node.js script to generate Resume Tracker PNG icons
 * Sizes: 16x16, 48x48, 128x128
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Raw uncompressed RGBA scanlines (each row starts with filter byte 0)
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = x / (width - 1 || 1);
      const ny = y / (height - 1 || 1);

      // Default transparent
      let r = 0, g = 0, b = 0, a = 0;

      // Rounded container check (radius 0.18)
      const cornerR = 0.18;
      let insideBase = true;
      const cx = nx < cornerR ? cornerR : (nx > 1 - cornerR ? 1 - cornerR : nx);
      const cy = ny < cornerR ? cornerR : (ny > 1 - cornerR ? 1 - cornerR : ny);
      const distSq = (nx - cx) ** 2 + (ny - cy) ** 2;

      if (distSq <= cornerR ** 2) {
        // Base container background: Indigo (#4F46E5) with subtle top-to-bottom shading
        const shade = 1 - ny * 0.15;
        r = Math.round(79 * shade);
        g = Math.round(70 * shade);
        b = Math.round(229 * shade);
        a = 255;

        // Document card representation
        const docLeft = 0.24, docRight = 0.76, docTop = 0.18, docBottom = 0.82;
        if (nx >= docLeft && nx <= docRight && ny >= docTop && ny <= docBottom) {
          // Document paper: pure white
          r = 255; g = 255; b = 255; a = 255;

          // Header line (indigo)
          if (ny >= 0.28 && ny <= 0.35 && nx >= 0.32 && nx <= 0.68) {
            r = 99; g = 102; b = 241; // #6366F1
          }
          // Content line 1 (slate-400)
          else if (ny >= 0.42 && ny <= 0.47 && nx >= 0.32 && nx <= 0.68) {
            r = 148; g = 163; b = 184; // #94A3B8
          }
          // Content line 2 (slate-400)
          else if (ny >= 0.53 && ny <= 0.58 && nx >= 0.32 && nx <= 0.58) {
            r = 148; g = 163; b = 184; // #94A3B8
          }
          // Content line 3 (slate-400)
          else if (ny >= 0.64 && ny <= 0.69 && nx >= 0.32 && nx <= 0.48) {
            r = 148; g = 163; b = 184; // #94A3B8
          }
        }

        // Emerald accent badge at bottom right
        const badgeCx = 0.72, badgeCy = 0.72, badgeR = 0.18;
        const badgeDistSq = (nx - badgeCx) ** 2 + (ny - badgeCy) ** 2;
        if (badgeDistSq <= badgeR ** 2) {
          // Emerald-500 (#10B981)
          r = 16; g = 185; b = 129; a = 255;
          // Inner checkmark center dot
          if (badgeDistSq <= (badgeR * 0.45) ** 2) {
            r = 255; g = 255; b = 255; a = 255;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function main() {
  const iconsDir = path.resolve(__dirname, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const pngBuffer = generatePng(size);
    const destPath = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(destPath, pngBuffer);
    console.log(`Generated: ${destPath} (${pngBuffer.length} bytes)`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generatePng };
