/**
 * Zero-Knowledge Proof Module for OPRF Correctness
 * 
 * Implements Schnorr-like proof that the server correctly evaluated
 * the OPRF using its committed secret key.
 * 
 * Protocol:
 * 1. Server commits to its secret key k by publishing G^k (public commitment)
 * 2. For each evaluation, server proves it used the same key k
 * 3. Client verifies proof without learning k
 * 
 * Security Properties:
 * - Soundness: Server cannot cheat with different key
 * - Zero-Knowledge: Client learns nothing about k
 * - Non-interactive: Using Fiat-Shamir heuristic
 */

import { p256 } from "@noble/curves/nist.js";
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

// P-256 curve order (from NIST specification)
const CURVE_ORDER = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');

/**
 * Server's public commitment to its secret key
 * This should be generated once and published
 */
export interface KeyCommitment {
  publicKey: string;  // G^k where k is server secret, G is generator
  timestamp: number;
  version: string;
}

/**
 * Proof of correct OPRF evaluation
 */
export interface OPRFProof {
  challenge: string;    // c = H(G, publicKey, blindedPoint, evaluatedPoint, commitment)
  response: string;     // s = r + c*k (mod order)
  commitment: string;   // R = G^r (random commitment)
}

/**
 * Generate public commitment to server's secret key
 * Should be called once during server setup
 * 
 * @param secretKey - Server's OPRF secret key
 */
export function generateKeyCommitment(secretKey: bigint): KeyCommitment {
  // Get generator point G by using getPublicKey with a byte array of value 1
  const oneBytes = new Uint8Array(32);
  oneBytes[31] = 1;
  const generatorBytes = p256.getPublicKey(oneBytes);
  const G = p256.Point.fromHex(bytesToHex(generatorBytes));
  
  // Compute public key = G^secretKey
  const publicKey = G.multiply(secretKey);
  
  return {
    publicKey: publicKey.toHex(),
    timestamp: Date.now(),
    version: '1.0.0'
  };
}

/**
 * Generate proof that evaluatedPoint = k * blindedPoint
 * 
 * @param secretKey - Server's secret OPRF key (k)
 * @param blindedPoint - Client's blinded point (P')
 * @param evaluatedPoint - Server's evaluation (k * P')
 * @param publicKey - Server's public commitment (G^k)
 */
export function generateOPRFProof(
  secretKey: bigint,
  blindedPointHex: string,
  evaluatedPointHex: string,
  publicKeyHex: string
): OPRFProof {
  // Parse points
  const blindedPoint = p256.Point.fromHex(blindedPointHex);
  const evaluatedPoint = p256.Point.fromHex(evaluatedPointHex);
  const publicKey = p256.Point.fromHex(publicKeyHex);
  
  // Get generator point G
  const oneBytes = new Uint8Array(32);
  oneBytes[31] = 1;
  const generatorBytes = p256.getPublicKey(oneBytes);
  const G = p256.Point.fromHex(bytesToHex(generatorBytes));
  
  // Step 1: Generate random nonce r
  const randomBytes = p256.utils.randomSecretKey();
  const r = BigInt('0x' + bytesToHex(randomBytes)) % CURVE_ORDER;
  
  // Step 2: Compute commitments
  // R1 = r * G
  const R1 = G.multiply(r);
  // R2 = r * P' (blinded point)
  const R2 = blindedPoint.multiply(r);
  
  // Step 3: Compute Fiat-Shamir challenge
  // c = H(G || publicKey || blindedPoint || evaluatedPoint || R1 || R2)
  const encoder = new TextEncoder();
  const challengeInput = encoder.encode(
    G.toHex() + publicKey.toHex() + blindedPoint.toHex() + 
    evaluatedPoint.toHex() + R1.toHex() + R2.toHex()
  );
  const challengeHashBytes = sha256(challengeInput);
  const c = BigInt('0x' + bytesToHex(challengeHashBytes)) % CURVE_ORDER;
  
  // Step 4: Compute response
  // s = r + c * k (mod order)
  const s = (r + c * secretKey) % CURVE_ORDER;
  
  return {
    challenge: c.toString(16),
    response: s.toString(16),
    commitment: R1.toHex() + '|' + R2.toHex()  // Store both commitments
  };
}

/**
 * Verify OPRF proof
 * 
 * Checks that the server used the correct secret key k corresponding
 * to the public commitment.
 * 
 * @param proof - The proof to verify
 * @param blindedPoint - Client's blinded point
 * @param evaluatedPoint - Server's evaluated point
 * @param publicKey - Server's public key commitment (G^k)
 */
export function verifyOPRFProof(
  proof: OPRFProof,
  blindedPointHex: string,
  evaluatedPointHex: string,
  publicKeyHex: string
): { valid: boolean; reason?: string } {
  try {
    // Parse inputs
    const blindedPoint = p256.Point.fromHex(blindedPointHex);
    const evaluatedPoint = p256.Point.fromHex(evaluatedPointHex);
    const publicKey = p256.Point.fromHex(publicKeyHex);
    
    // Get generator point G
    const oneBytes = new Uint8Array(32);
    oneBytes[31] = 1;
    const generatorBytes = p256.getPublicKey(oneBytes);
    const G = p256.Point.fromHex(bytesToHex(generatorBytes));
    
    // Parse proof
    const c = BigInt('0x' + proof.challenge);
    const s = BigInt('0x' + proof.response);
    const [R1hex, R2hex] = proof.commitment.split('|');
    const R1 = p256.Point.fromHex(R1hex);
    const R2 = p256.Point.fromHex(R2hex);
    
    // Recompute challenge
    const encoder = new TextEncoder();
    const challengeInput = encoder.encode(
      G.toHex() + publicKey.toHex() + blindedPoint.toHex() + 
      evaluatedPoint.toHex() + R1.toHex() + R2.toHex()
    );
    const challengeHashBytes = sha256(challengeInput);
    const cPrime = BigInt('0x' + bytesToHex(challengeHashBytes)) % CURVE_ORDER;
    
    // Verify challenge matches
    if (c !== cPrime) {
      return { valid: false, reason: 'Challenge verification failed' };
    }
    
    // Verify: s*G = R1 + c*publicKey
    const sG = G.multiply(s);
    const cPublicKey = publicKey.multiply(c);
    const R1_plus_cPK = R1.add(cPublicKey);
    
    if (!sG.equals(R1_plus_cPK)) {
      return { valid: false, reason: 'First equation verification failed (s*G != R1 + c*PK)' };
    }
    
    // Verify: s*P' = R2 + c*evaluatedPoint
    const sP = blindedPoint.multiply(s);
    const cEval = evaluatedPoint.multiply(c);
    const R2_plus_cEval = R2.add(cEval);
    
    if (!sP.equals(R2_plus_cEval)) {
      return { valid: false, reason: 'Second equation verification failed (s*P\' != R2 + c*Eval)' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Proof verification error: ' + (error as Error).message };
  }
}

/**
 * Simplified verification for browser clients
 * Assumes public key commitment is fetched from trusted source
 */
export async function verifyOPRFProofClient(
  proof: OPRFProof,
  blindedPoint: string,
  evaluatedPoint: string,
  publicKeyCommitmentUrl: string = '/server_key_commitment.json'
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Fetch public key commitment
    const response = await fetch(publicKeyCommitmentUrl);
    if (!response.ok) {
      return { valid: false, reason: 'Failed to fetch server key commitment' };
    }
    
    const commitment: KeyCommitment = await response.json();
    
    // Verify the proof
    return verifyOPRFProof(proof, blindedPoint, evaluatedPoint, commitment.publicKey);
  } catch (error) {
    return { valid: false, reason: 'Client verification failed: ' + (error as Error).message };
  }
}
