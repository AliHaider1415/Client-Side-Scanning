import { p256 } from "@noble/curves/nist.js";
import { bytesToHex } from '@noble/hashes/utils.js';
import { hashToCurve } from "../crypto/hashToCurve";
import { invert } from '@noble/curves/abstract/modular.js';


/**
 * Blinds a pHash using EC scalar multiplication
 */
export function blindPHash(phash: string) { 
  // Random blinding scalar r
  const r = BigInt(
    "0x" + Buffer.from(p256.utils.randomSecretKey()).toString("hex")
  );

  // Map hash → curve point P
  const P = hashToCurve(phash);

  // Blinded point: P' = r · P
  const blindedPoint = P.multiply(r);

  return {
    blindedHex: bytesToHex(blindedPoint.toBytes(true)), // compressed bytes to hex
    r,
  };
}

/**
 * Unblinds server-evaluated point
 */
export function unblindEvaluatedPoint(
  evaluatedHex: string,
  r: bigint
): string {
  const evaluatedPoint = p256.Point.fromHex(evaluatedHex);
  console.log("Evaluated Point:", evaluatedPoint);
  const n = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
  const rInv = invert(r, n);

  const unblinded = evaluatedPoint.multiply(rInv);
  return unblinded.toHex();
}
