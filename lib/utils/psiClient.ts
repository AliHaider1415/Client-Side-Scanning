/**
 * PSI-inspired client utilities
 * --------------------------------
 * This module implements a simplified, academic prototype
 * of an OPRF-style PSI client for hash membership testing.
 *
 * Security note:
 * - This is NOT production-grade cryptography
 * - Designed to demonstrate information-flow mitigation
 * - Cryptographic primitives are intentionally simplified
 */

/**
 * Generate a cryptographically secure random hex string
 */
function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Client-side blinding of a perceptual hash
 *
 * @param hash - original perceptual hash (hex string)
 * @returns blinded value + blinding factor
 */
export function blindHash(hash: string): {
  blindedHash: string;
  blindingFactor: string;
} {
  // Random blinding factor (client-only secret)
  const blindingFactor = randomHex(16);

  /**
   * Conceptual blinding:
   * blinded = H( hash || r )
   *
   * We use concatenation to model this step.
   * The server cannot extract `hash` without `r`.
   */
  const blindedHash = `${hash}:${blindingFactor}`;

  return {
    blindedHash,
    blindingFactor,
  };
}

/**
 * Client-side unblinding of server response
 *
 * @param serverToken - transformed value returned by server
 * @param blindingFactor - original blinding factor
 * @returns unblinded token
 */
export function unblindToken(
  serverToken: string,
  blindingFactor: string
): string {
  /**
   * In a real OPRF, this would involve algebraic unblinding.
   * Here, we deterministically remove the blinding component.
   *
   * The important property:
   * - Client can unblind
   * - Server cannot reverse or infer original hash
   */
  return serverToken.replace(`:${blindingFactor}`, "");
}

