/*
 * QR encoding portions adapted from Project Nayuki (MIT).
 * https://www.nayuki.io/page/qr-code-generator-library
 * Copyright (c) Project Nayuki.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** Returns an SVG data URL for img.src. Throws RangeError if the URL is too long. */
export function generateQRCode(url: string): string {
  const bytes = new TextEncoder().encode(url);
  const utf8 = bytes.some((byte) => byte > 127);

  // QR Model 2, error correction level L; entries are indexed by version.
  const eccLengths = [
    0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30,
  ];
  const blockCounts = [
    0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ];

  let version = 1;
  let rawCodewords = 0;
  let capacity = 0;
  for (; version <= 40; version++) {
    const alignmentCount = Math.floor(version / 7) + 2;
    let modules = (16 * version + 128) * version + 64;
    if (version >= 2) {
      modules -= (25 * alignmentCount - 10) * alignmentCount - 55;
      if (version >= 7) modules -= 36;
    }
    rawCodewords = Math.floor(modules / 8);
    capacity = rawCodewords - eccLengths[version]! * blockCounts[version]!;
    const countBits = version < 10 ? 8 : 16;
    if (bytes.length < 2 ** countBits && (utf8 ? 12 : 0) + 4 + countBits + bytes.length * 8 <= capacity * 8) break;
  }
  if (version > 40) throw new RangeError("URL is too long for a QR code");

  const bits: number[] = [];
  const append = (value: number, length: number): void => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  if (utf8) {
    append(0b0111, 4); // ECI identifies UTF-8 rather than the default ISO-8859-1.
    append(26, 8);
  }
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) append(byte, 8);
  append(0, Math.min(4, capacity * 8 - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity * 8; pad ^= 0xec ^ 0x11) {
    append(pad, 8);
  }
  const data = Array.from({ length: capacity }, (_, i) => bits.slice(i * 8, i * 8 + 8).reduce((value, bit) => (value << 1) | bit, 0));

  // Reed-Solomon arithmetic in GF(256), with primitive polynomial 0x11d.
  const multiply = (a: number, b: number): number => {
    let product = 0;
    while (b > 0) {
      if (b & 1) product ^= a;
      a <<= 1;
      if (a & 0x100) a ^= 0x11d;
      b >>>= 1;
    }
    return product;
  };
  const eccLength = eccLengths[version]!;
  const blockCount = blockCounts[version]!;
  let generator = [1];
  let root = 1;
  for (let i = 0; i < eccLength; i++) {
    const next = new Array<number>(generator.length + 1).fill(0);
    generator.forEach((coefficient, j) => {
      next[j] = next[j]! ^ coefficient;
      next[j + 1] = next[j + 1]! ^ multiply(coefficient, root);
    });
    generator = next;
    root = multiply(root, 2);
  }

  const blocks: number[][] = [];
  const corrections: number[][] = [];
  const shortDataLength = Math.floor(rawCodewords / blockCount) - eccLength;
  const shortBlockCount = blockCount - (rawCodewords % blockCount);
  let offset = 0;
  for (let i = 0; i < blockCount; i++) {
    const length = shortDataLength + (i < shortBlockCount ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;
    const remainder = [...block, ...new Array<number>(eccLength).fill(0)];
    for (let j = 0; j < length; j++) {
      const factor = remainder[j]!;
      for (let k = 0; k < generator.length; k++) {
        remainder[j + k] = remainder[j + k]! ^ multiply(generator[k]!, factor);
      }
    }
    blocks.push(block);
    corrections.push(remainder.slice(length));
  }
  const codewords: number[] = [];
  for (let i = 0; i <= shortDataLength; i++) {
    for (const block of blocks) {
      if (i < block.length) codewords.push(block[i]!);
    }
  }
  for (let i = 0; i < eccLength; i++) {
    for (const block of corrections) codewords.push(block[i]!);
  }

  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, value: number): void => {
    matrix[y]![x] = value;
    reserved[y]![x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, 1 - (i % 2));
    set(i, 6, 1 - (i % 2));
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx! + dx;
        const y = cy! + dy;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) {
          set(x, y, Number(distance !== 2 && distance !== 4));
        }
      }
    }
  }
  if (version > 1) {
    const count = Math.floor(version / 7) + 2;
    const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
    const positions = [6];
    for (let p = size - 7; positions.length < count; p -= step) positions.splice(1, 0, p);
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        if ((i === 0 && (j === 0 || j === count - 1)) || (i === count - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            set(positions[i]! + dx, positions[j]! + dy, Number(Math.max(Math.abs(dx), Math.abs(dy)) !== 1));
          }
        }
      }
    }
  }
  const drawFormat = (mask: number): void => {
    const value = (1 << 3) | mask; // Level L has format indicator 01.
    let remainder = value;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const format = ((value << 10) | remainder) ^ 0x5412;
    const bit = (i: number): number => (format >>> i) & 1;
    for (let i = 0; i < 6; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, 1);
  };
  drawFormat(0);
  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const value = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, (value >>> i) & 1);
      set(b, a, (value >>> i) & 1);
    }
  }

  let index = 0;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical;
      for (let x = right; x >= right - 1; x--) {
        if (reserved[y]![x]) continue;
        matrix[y]![x] = index < codewords.length * 8 ? (codewords[index >>> 3]! >>> (7 - (index & 7))) & 1 : 0;
        index++;
      }
    }
  }

  const masks = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (_x: number, y: number) => y % 2 === 0,
    (x: number, _y: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (mask: number): void => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!reserved[y]![x] && masks[mask]!(x, y)) matrix[y]![x] = matrix[y]![x]! ^ 1;
      }
    }
  };
  const penalty = (): number => {
    let score = 0;
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = matrix[y]![x]!;
        dark += color;
        if (x > 0 && y > 0 && color === matrix[y]![x - 1] && color === matrix[y - 1]![x] && color === matrix[y - 1]![x - 1]) score += 3;
      }
    }
    for (let axis = 0; axis < 2; axis++) {
      for (let i = 0; i < size; i++) {
        const line = axis === 0 ? matrix[i]! : matrix.map((row) => row[i]!);
        let run = 0;
        let previous = -1;
        for (const color of line) {
          run = color === previous ? run + 1 : 1;
          if (run === 5) score += 3;
          else if (run > 5) score++;
          previous = color;
        }
        const text = line.join("");
        for (let j = 0; j <= size - 11; j++) {
          const pattern = text.slice(j, j + 11);
          if (pattern === "00001011101" || pattern === "10111010000") score += 40;
        }
      }
    }
    return score + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty();
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(mask);
  }
  applyMask(bestMask);
  drawFormat(bestMask);

  // Four light modules on every side form the required quiet zone.
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y]![x]) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
  }
  const dimension = size + 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension * 4}" height="${dimension * 4}" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${dimension}v${dimension}H0z"/><path fill="#000" d="${path}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
