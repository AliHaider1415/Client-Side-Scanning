export async function computePHashClient(file: File): Promise<string> {
  const size = 32;

  // Load image from File
  const imageBitmap = await createImageBitmap(file);

  // Create browser canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(imageBitmap, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);

  // Convert to grayscale
  const grayMatrix: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      row.push(gray);
    }
    grayMatrix.push(row);
  }

  // 2D DCT
  const dct2D = (matrix: number[][]): number[][] => {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    const c = (u: number) => (u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N));

    for (let u = 0; u < N; u++) {
      for (let v = 0; v < N; v++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            sum +=
              matrix[i][j] *
              Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) *
              Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
          }
        }
        result[u][v] = c(u) * c(v) * sum;
      }
    }
    return result;
  };

  const dctMatrix = dct2D(grayMatrix);

  // Extract top-left 8×8 block (excluding DC)
  const dctValues: number[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i !== 0 || j !== 0) {
        dctValues.push(dctMatrix[i][j]);
      }
    }
  }

  // Median
  const sorted = [...dctValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  // Build binary hash
  let binaryHash = "";
  for (const val of dctValues) {
    binaryHash += val > med ? "1" : "0";
  }

  // Convert to hex
  const hashHex = BigInt("0b" + binaryHash)
    .toString(16)
    .padStart(16, "0");

  return hashHex;
}
