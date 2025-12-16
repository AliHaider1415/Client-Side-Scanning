import { computePHash } from "./../utils/pHash";
// import phashes from "../../public/pHashes/phashes.json";
import storedKeyedHashes from "../../public/ehashes/evaluated_phashes.json";
import { Fk } from "../utils/serverKeyedTransform";

// v1

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

// export async function scanImage(filePath: string) {
//   try {
//     const hash = await computePHash(filePath);
//     console.log("Computed pHash:", hash);

//     // Threshold: usually <= 10 means visually similar (adjust as needed)
//     const threshold = 10;

//     for (const entry of phashes) {
//       const dist = hammingDistance(hash, entry.phash);
//       if (dist <= threshold) {
//         return {
//           matched: true,
//           file: entry.file,
//           hammingDistance: dist,
//           reason: `Image similar to known bad image: ${entry.file}`,
//         };
//       }
//     }

//     // No match found
//     return { matched: false };
//   } catch (err) {
//     console.error("Failed to compute pHash", err);
//     throw err;
//   }
// }

// v2

// export function comparePHashes(
//   userHash: string,
//   threshold: number = 10
// ) {

//   for (const entry of phashes) {
//       const dist = hammingDistance(userHash, entry.phash);
//       if (dist <= threshold) {
//         return {
//           matched: true,
//           hammingDistance: dist,
//           reason: `Image similar to a known bad image`,
//         };
//       }
//     }

//   return {
//     matched: false,
//   };
// }

// v3

type ScanResult = {
  matched: boolean;
  file?: string;
  hammingDistance?: number;
  reason?: string;
};

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Count bits set in a byte (0-255)
 */
function countSetBits(byte: number): number {
  let count = 0;
  let val = byte;
  while (val) {
    count += val & 1;
    val >>= 1;
  }
  return count;
}

export function scanBlindedHash(
  blindedHash: string,
  threshold = 10
): ScanResult {
  const transformedHash = Fk(blindedHash);

  for (const entry of storedKeyedHashes) {
    const dist = hammingDistance(transformedHash, entry.phash);
    console.log("Comparing with stored hash:", entry.phash, "Distance:", dist);
    if (dist <= threshold) {
      return {
        matched: true,
        hammingDistance: dist,
        reason: `Image similar to a known bad image`,
      };
    }
  }

  return { matched: false };
}


export function localMatch(unblindedToken: string, threshold = 10) {
  for (const entry of storedKeyedHashes) {
    const dist = hammingDistance(unblindedToken, entry.phash);
    if (dist <= threshold) {
      return {
        matched: true,
        // file: entry.file,
        hammingDistance: dist,
        reason: `Image similar to a known bad image`,
      };
    }
  }
  return { matched: false };
}