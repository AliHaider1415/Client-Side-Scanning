import crypto from "crypto";

/**
 * Server-side keyed transformation function F_k
 *
 * Implements:
 *   F_k(x) = HMAC-SHA256(k, x)
 *
 * Properties:
 * - Deterministic
 * - One-way
 * - Keyed (server-only)
 */
const SERVER_SECRET_KEY =
  process.env.SERVER_SECRET_KEY || "dev-secret-key-change-me";

export function Fk(input: string): string {
  return crypto
    .createHmac("sha256", SERVER_SECRET_KEY)
    .update(input)
    .digest("hex");
}
