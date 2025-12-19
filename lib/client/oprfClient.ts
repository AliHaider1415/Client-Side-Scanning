import { p256 } from "@noble/curves/nist.js";
import { bytesToHex } from '@noble/hashes/utils.js';
import { hashToCurve } from "../crypto/hashToCurve";
import { invert } from '@noble/curves/abstract/modular.js';
import { verifyOPRFProof, OPRFProof } from "../crypto/zkProof";


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
 * Unblinds server-evaluated point with proof verification
 */
export function unblindEvaluatedPoint(
  evaluatedHex: string,
  r: bigint,
  blindedHex?: string,
  proof?: OPRFProof,
  publicKey?: string
): string {
  const evaluatedPoint = p256.Point.fromHex(evaluatedHex);
  console.log("Evaluated Point:", evaluatedPoint);
  
  // Verify proof if provided
  if (proof && blindedHex && publicKey) {
    const verification = verifyOPRFProof(proof, blindedHex, evaluatedHex, publicKey);
    if (!verification.valid) {
      console.warn('⚠️ OPRF proof verification failed:', verification.reason);
      throw new Error('Server OPRF evaluation proof invalid: ' + verification.reason);
    }
    console.log('✅ OPRF proof verified successfully');
  }
  
  const n = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
  const rInv = invert(r, n);

  const unblinded = evaluatedPoint.multiply(rInv);
  return unblinded.toHex();
}
