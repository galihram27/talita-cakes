export const ROUND_MIN_OPTIONS = [16, 18, 20];
export const SQUARE_MIN_OPTIONS = [18, 20];
export const MAX_SIZE = 30;

// generate range size dari minSize sampai 30, kelipatan 2
// contoh: generateSizeRange(18) -> [18, 20, 22, 24, 26, 28, 30]
export const generateSizeRange = (minSize) => {
  const sizes = [];
  for (let s = minSize; s <= MAX_SIZE; s += 2) {
    sizes.push(s);
  }
  return sizes;
};

// validasi size untuk TYPE1 (input manual, bebas asal angka bulat positif)
export const isValidManualSize = (size) => {
  return Number.isInteger(size) && size > 0;
};

// validasi size individual tetap dipakai untuk pengecekan dasar (genap & dalam rentang)
export const isValidSize = (shape, size) => {
  if (shape === 'ROUND') {
    return size >= 16 && size <= MAX_SIZE && size % 2 === 0;
  }
  if (shape === 'SQUARE') {
    return size >= 18 && size <= MAX_SIZE && size % 2 === 0;
  }
  return false;
};

export const hasRoundAndSquare = (variants) => {
  const hasRound = variants.some((v) => v.shape === 'ROUND');
  const hasSquare = variants.some((v) => v.shape === 'SQUARE');
  return hasRound && hasSquare;
};

export const hasDuplicateVariant = (variants) => {
  const seen = new Set();
  for (const v of variants) {
    const key = `${v.shape}-${v.size}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
};

/**
 * Validasi bahwa untuk shape tertentu, size yang diinput LENGKAP
 * dari min size yang dipilih sampai 30cm, kelipatan 2, tanpa bolong/lebih.
 *
 * @param {string} shape - 'ROUND' | 'SQUARE'
 * @param {number[]} sizes - daftar size yang diinput admin untuk shape ini
 * @returns {{ valid: boolean, message?: string }}
 */
export const validateSizeCompleteness = (shape, sizes) => {
  const minOptions = shape === 'ROUND' ? ROUND_MIN_OPTIONS : SQUARE_MIN_OPTIONS;

  const sortedSizes = [...sizes].sort((a, b) => a - b);
  const minSize = sortedSizes[0];

  if (!minOptions.includes(minSize)) {
    return {
      valid: false,
      message: `Size awal untuk ${shape} harus salah satu dari: ${minOptions.join(', ')}`,
    };
  }

  const expectedSizes = generateSizeRange(minSize);

  const isComplete =
    expectedSizes.length === sortedSizes.length &&
    expectedSizes.every((size, idx) => size === sortedSizes[idx]);

  if (!isComplete) {
    return {
      valid: false,
      message: `${shape} wajib diisi lengkap dari ${minSize}cm sampai ${MAX_SIZE}cm (kelipatan 2): ${expectedSizes.join(', ')}`,
    };
  }

  return { valid: true };
};

// validasi semua variant (gabungan ROUND & SQUARE) sekaligus
export const validateAllVariantsCompleteness = (variants) => {
  const roundSizes = variants.filter((v) => v.shape === 'ROUND').map((v) => v.size);
  const squareSizes = variants.filter((v) => v.shape === 'SQUARE').map((v) => v.size);

  if (roundSizes.length > 0) {
    const result = validateSizeCompleteness('ROUND', roundSizes);
    if (!result.valid) return result;
  }

  if (squareSizes.length > 0) {
    const result = validateSizeCompleteness('SQUARE', squareSizes);
    if (!result.valid) return result;
  }

  return { valid: true };
};