import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const body = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with scanline filter bytes
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderWhyUIIcon(x, y, w, h) {
  // Normalize coordinates -1 to 1
  const nx = (x / (w - 1)) * 2 - 1;
  const ny = (y / (h - 1)) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Rounded rectangle icon background (radius ~ 0.85)
  const cornerRadius = 0.35;
  const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
  const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
  const roundedDist = Math.sqrt(qx * qx + qy * qy);

  if (roundedDist > cornerRadius) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Border antialiasing
  const edgeDist = cornerRadius - roundedDist;
  const alphaFactor = Math.min(1, Math.max(0, edgeDist * (w / 2)));

  // Sleek Dark DevTools background gradient: Deep navy to slate
  const grad = (ny + 1) / 2;
  const rBg = Math.round(15 + grad * 15);
  const gBg = Math.round(23 + grad * 20);
  const bBg = Math.round(42 + grad * 25);

  // Foreground: Cyan inspect ring with crosshairs + "W" or "?" symbol
  // Inspect ring at radius 0.48, thickness 0.12
  const ringDist = Math.abs(dist - 0.48);
  const isRing = ringDist < 0.12;

  // Crosshair ticks
  const isTickX = Math.abs(ny) < 0.08 && Math.abs(nx) > 0.35 && Math.abs(nx) < 0.75;
  const isTickY = Math.abs(nx) < 0.08 && Math.abs(ny) > 0.35 && Math.abs(ny) < 0.75;

  // Center Question/Inspection indicator: vibrant cyan (#06b6d4) & amber (#f59e0b)
  if (isRing || isTickX || isTickY) {
    return [6, 182, 212, Math.round(255 * alphaFactor)]; // Cyan 500
  }

  // Inner subtle accent
  if (dist < 0.22) {
    return [245, 158, 11, Math.round(240 * alphaFactor)]; // Amber 500
  }

  return [rBg, gBg, bBg, Math.round(255 * alphaFactor)];
}

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const buf = createPNG(size, size, renderWhyUIIcon);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png`);
});
