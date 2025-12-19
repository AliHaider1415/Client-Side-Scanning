import { p256_hasher } from "@noble/curves/nist.js";

export function hashToCurve(hashHex: string) {
  const bytes = Uint8Array.from(Buffer.from(hashHex, 'hex'));

  // Use p256_hasher which provides hash-to-curve functionality
  const point = p256_hasher.hashToCurve(bytes);

  return point;
}
