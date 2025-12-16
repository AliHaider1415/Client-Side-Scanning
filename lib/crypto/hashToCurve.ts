import { p256_hasher } from '@noble/curves/nist.js';

export function hashToCurve(hashHex: string) {
  const bytes = Uint8Array.from(Buffer.from(hashHex, 'hex'));

  const point = p256_hasher.hashToCurve(bytes);

  return point;
}
