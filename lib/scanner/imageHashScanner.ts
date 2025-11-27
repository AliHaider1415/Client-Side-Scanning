import { computePHash } from "./../utils/pHash";
import phashes from "../../public/pHashes/phashes.json";

// Compute Hamming distance between two hex hashes
function hammingDistance(hash1: string, hash2: string): number {
  // Convert hex strings to BigInt
  const b1 = BigInt("0x" + hash1);
  const b2 = BigInt("0x" + hash2);
  // XOR to find differing bits
  let x = b1 ^ b2;

  let dist = 0;
  while (x) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  return dist;
}

export async function scanImage(filePath: string) {
  try {
    const hash = await computePHash(filePath);
    console.log("Computed pHash:", hash);

    // Threshold: usually <= 10 means visually similar (adjust as needed)
    const threshold = 10;

    for (const entry of phashes) {
      const dist = hammingDistance(hash, entry.phash);
      if (dist <= threshold) {
        return {
          matched: true,
          file: entry.file,
          hammingDistance: dist,
          reason: `Image similar to known bad image: ${entry.file}`,
        };
      }
    }

    // No match found
    return { matched: false };
  } catch (err) {
    console.error("Failed to compute pHash", err);
    throw err;
  }
}
