import { p256 } from "@noble/curves/nist.js";

/**
 * Server secret OPRF key
 * MUST remain server-only
 */
export const SERVER_OPRF_KEY = BigInt(
  process.env.SERVER_OPRF_KEY ||
    "123456789012345678901234567890123456789"
);

/**
 * Evaluates blinded EC point using server secret
 */
export function evaluateBlindedPoint(blindedHex: string): string {
  const blindedPoint = p256.Point.fromHex(blindedHex);
  const evaluatedPoint = blindedPoint.multiply(SERVER_OPRF_KEY);
  return evaluatedPoint.toHex();
}
