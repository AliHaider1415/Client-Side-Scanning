import { createCanvas, loadImage } from "canvas";

// Adapt computePHash to Node.js: takes image path instead of File object
export async function computePHash(imagePath: string): Promise<string> {
  const size = 32;
  const image = await loadImage(imagePath);

  // Create offscreen canvas & draw image resized
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, size, size);

  // Get image data and convert to grayscale matrix (similar to getResizedGrayscaleMatrix)
  const imageData = ctx.getImageData(0, 0, size, size);

  // We’ll need to slightly modify your toGrayscaleMatrix and dct2D to accept ImageData from canvas (or import them if already exported)
  // For simplicity, create versions here or import your helpers

  function toGrayscaleMatrix(imageData: any, width: number, height: number): number[][] {
    const matrix: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        row.push(gray);
      }
      matrix.push(row);
    }
    return matrix;
  }

  function dct2D(matrix: number[][]): number[][] {
    const N = matrix.length;
    const result: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
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
  }

  function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const grayMatrix = toGrayscaleMatrix(imageData, size, size);
  const dctMatrix = dct2D(grayMatrix);

  // Extract 8x8 DCT block, skip DC coefficient
  const dctValues: number[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i !== 0 || j !== 0) dctValues.push(dctMatrix[i][j]);
    }
  }

  const med = median(dctValues);

  let hash = "";
  for (const val of dctValues) {
    hash += val > med ? "1" : "0";
  }

  const hashHex = BigInt("0b" + hash).toString(16).padStart(16, "0");
  return hashHex;
}


