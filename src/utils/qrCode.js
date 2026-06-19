const DATA_CODEWORDS_LOW = [0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274];
const ECC_CODEWORDS_PER_BLOCK_LOW = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
const BLOCK_COUNT_LOW = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
const ALIGNMENT_PATTERN_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function getMaxByteLength(version) {
  const countBits = version < 10 ? 8 : 16;
  return Math.floor((DATA_CODEWORDS_LOW[version] * 8 - 4 - countBits) / 8);
}

function chooseVersion(byteLength) {
  for (let version = 1; version <= 10; version += 1) {
    if (byteLength <= getMaxByteLength(version)) return version;
  }
  throw new Error("QR로 표시하기에는 토큰이 너무 깁니다.");
}

function makeDataCodewords(bytes, version) {
  const countBits = version < 10 ? 8 : 16;
  const dataCodewords = DATA_CODEWORDS_LOW[version];
  const capacityBits = dataCodewords * 8;
  const bits = [];

  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, bytes.length, countBits);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const terminatorLength = Math.min(4, capacityBits - bits.length);
  appendBits(bits, 0, terminatorLength);
  while (bits.length % 8 !== 0) bits.push(0);

  const result = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    result.push(value);
  }

  for (let pad = 0; result.length < dataCodewords; pad += 1) {
    result.push(pad % 2 === 0 ? 0xec : 0x11);
  }
  return result;
}

function makeGaloisTables() {
  const exp = Array(512).fill(0);
  const log = Array(256).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = makeGaloisTables();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function makeGenerator(degree) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = Array(result.length + 1).fill(0);
    result.forEach((coefficient, index) => {
      next[index] ^= gfMultiply(coefficient, GF.exp[i]);
      next[index + 1] ^= coefficient;
    });
    result = next;
  }
  return result;
}

function makeErrorCorrection(data, degree) {
  const generator = makeGenerator(degree);
  const result = Array(degree).fill(0);

  data.forEach((value) => {
    const factor = value ^ result.shift();
    result.push(0);
    generator.slice(0, degree).forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });

  return result;
}

function addErrorCorrection(dataCodewords, version) {
  const blockCount = BLOCK_COUNT_LOW[version];
  const eccLength = ECC_CODEWORDS_PER_BLOCK_LOW[version];
  const rawCodewords = DATA_CODEWORDS_LOW[version] + eccLength * blockCount;
  const shortBlockCount = blockCount - (rawCodewords % blockCount);
  const shortBlockDataLength = Math.floor(rawCodewords / blockCount) - eccLength;
  const blocks = [];
  let offset = 0;

  for (let block = 0; block < blockCount; block += 1) {
    const dataLength = shortBlockDataLength + (block < shortBlockCount ? 0 : 1);
    const data = dataCodewords.slice(offset, offset + dataLength);
    offset += dataLength;
    blocks.push({ data, ecc: makeErrorCorrection(data, eccLength) });
  }

  const result = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < maxDataLength; i += 1) {
    blocks.forEach((block) => {
      if (i < block.data.length) result.push(block.data[i]);
    });
  }
  for (let i = 0; i < eccLength; i += 1) {
    blocks.forEach((block) => result.push(block.ecc[i]));
  }
  return result;
}

function makeMatrix(size) {
  return {
    modules: Array.from({ length: size }, () => Array(size).fill(false)),
    functionModules: Array.from({ length: size }, () => Array(size).fill(false)),
  };
}

function setModule(matrix, x, y, value, isFunction = false) {
  if (x < 0 || y < 0 || y >= matrix.modules.length || x >= matrix.modules.length) return;
  matrix.modules[y][x] = Boolean(value);
  if (isFunction) matrix.functionModules[y][x] = true;
}

function drawFinder(matrix, x, y) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      const isInside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const isBlack =
        isInside &&
        (dx === 0 ||
          dx === 6 ||
          dy === 0 ||
          dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(matrix, xx, yy, isBlack, true);
    }
  }
}

function drawAlignment(matrix, x, y) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, x + dx, y + dy, distance !== 1, true);
    }
  }
}

function drawFunctionPatterns(matrix, version) {
  const size = matrix.modules.length;
  drawFinder(matrix, 0, 0);
  drawFinder(matrix, size - 7, 0);
  drawFinder(matrix, 0, size - 7);

  for (let i = 8; i < size - 8; i += 1) {
    setModule(matrix, i, 6, i % 2 === 0, true);
    setModule(matrix, 6, i, i % 2 === 0, true);
  }

  const positions = ALIGNMENT_PATTERN_POSITIONS[version] ?? [];
  positions.forEach((y) => {
    positions.forEach((x) => {
      if (matrix.functionModules[y]?.[x]) return;
      drawAlignment(matrix, x, y);
    });
  });

  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      matrix.functionModules[8][i] = true;
      matrix.functionModules[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    matrix.functionModules[8][size - 1 - i] = true;
    matrix.functionModules[size - 1 - i][8] = true;
  }
  setModule(matrix, 8, size - 8, true, true);
}

function getVersionBits(version) {
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1f25);
  }
  return (version << 12) | remainder;
}

function drawVersionBits(matrix, version) {
  if (version < 7) return;

  const size = matrix.modules.length;
  const bits = getVersionBits(version);

  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setModule(matrix, a, b, bit, true);
    setModule(matrix, b, a, bit, true);
  }
}

function maskBit(x, y) {
  return (x + y) % 2 === 0;
}

function drawData(matrix, codewords) {
  const size = matrix.modules.length;
  const bits = codewords.flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (matrix.functionModules[y][x]) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex] : 0;
        bitIndex += 1;
        setModule(matrix, x, y, Boolean(bit) !== maskBit(x, y), false);
      }
    }
    upward = !upward;
  }
}

function getFormatBits() {
  const errorCorrectionLow = 1;
  const mask = 0;
  let data = (errorCorrectionLow << 3) | mask;
  let bits = data << 10;
  const generator = 0x537;

  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) bits ^= generator << (i - 10);
  }
  return (((data << 10) | bits) ^ 0x5412) & 0x7fff;
}

function drawFormatBits(matrix) {
  const size = matrix.modules.length;
  const bits = getFormatBits();

  for (let i = 0; i <= 5; i += 1) setModule(matrix, 8, i, ((bits >>> i) & 1) !== 0, true);
  setModule(matrix, 8, 7, ((bits >>> 6) & 1) !== 0, true);
  setModule(matrix, 8, 8, ((bits >>> 7) & 1) !== 0, true);
  setModule(matrix, 7, 8, ((bits >>> 8) & 1) !== 0, true);
  for (let i = 9; i < 15; i += 1) setModule(matrix, 14 - i, 8, ((bits >>> i) & 1) !== 0, true);

  for (let i = 0; i < 8; i += 1) setModule(matrix, size - 1 - i, 8, ((bits >>> i) & 1) !== 0, true);
  for (let i = 8; i < 15; i += 1)
    setModule(matrix, 8, size - 15 + i, ((bits >>> i) & 1) !== 0, true);
  setModule(matrix, 8, size - 8, true, true);
}

export function createQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text ?? "")));
  if (bytes.length === 0) throw new Error("QR로 표시할 값이 없습니다.");

  const version = chooseVersion(bytes.length);
  const size = version * 4 + 17;
  const matrix = makeMatrix(size);
  const dataCodewords = makeDataCodewords(bytes, version);
  const codewords = addErrorCorrection(dataCodewords, version);

  drawFunctionPatterns(matrix, version);
  drawVersionBits(matrix, version);
  drawData(matrix, codewords);
  drawFormatBits(matrix);

  return matrix.modules;
}

export function createQrSvg(text, { moduleSize = 6, margin = 4 } = {}) {
  const modules = createQrMatrix(text);
  const size = modules.length;
  const viewBoxSize = size + margin * 2;
  const rects = [];

  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) rects.push(`<rect x="${x + margin}" y="${y + margin}" width="1" height="1"/>`);
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize * moduleSize}" height="${viewBoxSize * moduleSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${rects.join("")}</svg>`;
}
