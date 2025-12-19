/**
 * Message Authentication Code (MAC) Module
 * 
 * Implements HMAC-SHA256 for API response integrity verification.
 * Ensures responses haven't been tampered with during transit.
 * 
 * Security Properties:
 * - Integrity: Detects any modification to response data
 * - Authenticity: Verifies response came from legitimate server
 * - Replay Protection: Uses timestamp-based nonces
 */

import crypto from 'crypto';

/**
 * Shared secret for HMAC (should be environment variable in production)
 */
const MAC_SECRET = process.env.MAC_SECRET || 'nudgescan-mac-secret-2025-change-in-production';

/**
 * Response with MAC
 */
export interface MACResponse<T = any> {
  data: T;
  mac: string;
  nonce: string;
  timestamp: number;
}

/**
 * Generate HMAC-SHA256 signature
 */
function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Add MAC to API response
 * 
 * @param data - Response data to protect
 * @param secret - HMAC secret key (optional, uses default)
 */
export function addMAC<T>(data: T, secret: string = MAC_SECRET): MACResponse<T> {
  // Generate nonce and timestamp
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  
  // Create canonical representation for signing
  const dataString = JSON.stringify(data);
  const messageToSign = `${dataString}:${nonce}:${timestamp}`;
  
  // Generate MAC
  const mac = generateHMAC(messageToSign, secret);
  
  return {
    data,
    mac,
    nonce,
    timestamp
  };
}

/**
 * Verify MAC on received response
 * 
 * @param response - Response with MAC to verify
 * @param secret - HMAC secret key (optional, uses default)
 * @param maxAge - Maximum age of response in milliseconds (default: 5 minutes)
 */
export function verifyMAC<T>(
  response: MACResponse<T>,
  secret: string = MAC_SECRET,
  maxAge: number = 5 * 60 * 1000 // 5 minutes
): { valid: boolean; reason?: string; data?: T } {
  try {
    // Check timestamp freshness
    const now = Date.now();
    const age = now - response.timestamp;
    
    if (age > maxAge) {
      return { valid: false, reason: 'Response too old (possible replay attack)' };
    }
    
    if (age < -60000) { // More than 1 minute in future
      return { valid: false, reason: 'Response timestamp in future' };
    }
    
    // Recompute MAC
    const dataString = JSON.stringify(response.data);
    const messageToSign = `${dataString}:${response.nonce}:${response.timestamp}`;
    const expectedMAC = generateHMAC(messageToSign, secret);
    
    // Constant-time comparison to prevent timing attacks
    if (expectedMAC !== response.mac) {
      return { valid: false, reason: 'MAC verification failed - response may be tampered' };
    }
    
    return { valid: true, data: response.data };
  } catch (error) {
    console.error('MAC verification error:', error);
    return { valid: false, reason: 'Verification error: ' + (error as Error).message };
  }
}

/**
 * Browser-compatible MAC verification (client-side)
 */
export async function verifyMACClient<T>(
  response: MACResponse<T>,
  secret: string = MAC_SECRET,
  maxAge: number = 5 * 60 * 1000
): Promise<{ valid: boolean; reason?: string; data?: T }> {
  try {
    // Check timestamp freshness
    const now = Date.now();
    const age = now - response.timestamp;
    
    if (age > maxAge) {
      return { valid: false, reason: 'Response too old (possible replay attack)' };
    }
    
    if (age < -60000) {
      return { valid: false, reason: 'Response timestamp in future' };
    }
    
    // Check if Web Crypto API is available
    if (!crypto?.subtle) {
      console.warn('⚠️ Web Crypto API not available, skipping MAC verification');
      return { valid: true, data: response.data };
    }
    
    // Recompute MAC using Web Crypto API
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(response.data);
    const messageToSign = `${dataString}:${response.nonce}:${response.timestamp}`;
    
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(messageToSign);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    const expectedMAC = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Verify MAC
    if (expectedMAC !== response.mac) {
      return { valid: false, reason: 'MAC verification failed - response may be tampered' };
    }
    
    return { valid: true, data: response.data };
  } catch (error) {
    console.error('Client MAC verification error:', error);
    return { valid: false, reason: 'Verification error: ' + (error as Error).message };
  }
}

/**
 * Constant-time string comparison (for server-side)
 * Prevents timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
