import { p256 } from "@noble/curves/nist.js";
import { generateOPRFProof, OPRFProof } from "../crypto/zkProof";

/**
 * Server secret OPRF key
 * MUST remain server-only
 */
export const SERVER_OPRF_KEY = BigInt(
  process.env.SERVER_OPRF_KEY ||
    "123456789012345678901234567890123456789"
);

/**
 * Server's public key commitment (G^k)
 * This is safe to share publicly
 */
let _publicKeyCommitment: string | null = null;

export function getPublicKeyCommitment(): string {
  if (!_publicKeyCommitment) {
    // Use the pre-generated commitment or generate using getPublicKey
    // getPublicKey with secret key will give us G^k
    const secretKeyBytes = new Uint8Array(32);
    const view = new DataView(secretKeyBytes.buffer);
    const secretBigInt = SERVER_OPRF_KEY;
    // Convert BigInt to bytes (simplified - should be proper encoding)
    const hex = secretBigInt.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      secretKeyBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    _publicKeyCommitment = Buffer.from(p256.getPublicKey(secretKeyBytes)).toString('hex');
  }
  return _publicKeyCommitment;
}

/**
 * Evaluates blinded EC point using server secret
 * Now includes proof of correct evaluation
 */
export function evaluateBlindedPoint(blindedHex: string): {
  evaluatedPoint: string;
  proof: OPRFProof;
} {
  const blindedPoint = p256.Point.fromHex(blindedHex);
  const evaluatedPoint = blindedPoint.multiply(SERVER_OPRF_KEY);
  const evaluatedHex = evaluatedPoint.toHex();
  
  // Generate proof of correct evaluation
  const publicKey = getPublicKeyCommitment();
  const proof = generateOPRFProof(
    SERVER_OPRF_KEY,
    blindedHex,
    evaluatedHex,
    publicKey
  );
  
  return {
    evaluatedPoint: evaluatedHex,
    proof
  };
}
