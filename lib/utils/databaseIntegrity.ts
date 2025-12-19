/**
 * Database Integrity Protection Module
 * 
 * Implements cryptographic integrity verification for the evaluated hash database
 * using SHA-256 hashing and HMAC-based signatures.
 * 
 * Security Properties:
 * - Tamper Detection: Any modification to database is detected
 * - Freshness: Timestamp prevents replay of old databases
 * - Authenticity: HMAC signature verifies database source
 */

/**
 * Compute SHA-256 hash of database content
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute HMAC-SHA256 signature
 */
async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataBuffer = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Database signature structure
 */
export interface DatabaseSignature {
  hash: string;           // SHA-256 hash of database content
  signature: string;      // HMAC-SHA256 signature
  timestamp: number;      // Unix timestamp of signature creation
  version: string;        // Database version identifier
}

/**
 * Verify database integrity
 * 
 * @param databaseContent - JSON string of the database
 * @param signature - Signature object to verify against
 * @param signingKey - Secret key for HMAC verification (should match server)
 * @returns true if database is valid and unmodified
 */
export async function verifyDatabaseIntegrity(
  databaseContent: string,
  signature: DatabaseSignature,
  signingKey: string = 'client-database-verification-key-2025'
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Step 1: Verify timestamp is recent (within 30 days)
    const now = Date.now();
    const signatureAge = now - signature.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    if (signatureAge > maxAge) {
      return { valid: false, reason: 'Database signature expired' };
    }

    // Step 2: Compute hash of current database content
    const computedHash = await sha256(databaseContent);
    
    if (computedHash !== signature.hash) {
      return { valid: false, reason: 'Database hash mismatch - database has been modified' };
    }

    // Step 3: Verify HMAC signature
    const dataToSign = `${signature.hash}:${signature.timestamp}:${signature.version}`;
    const computedSignature = await hmacSha256(signingKey, dataToSign);
    
    if (computedSignature !== signature.signature) {
      return { valid: false, reason: 'Invalid signature - database not from trusted source' };
    }

    // All checks passed
    return { valid: true };
  } catch (error) {
    console.error('Error verifying database integrity:', error);
    return { valid: false, reason: 'Verification error: ' + (error as Error).message };
  }
}

/**
 * Generate signature for database (server-side or build-time)
 * 
 * @param databaseContent - JSON string of the database
 * @param version - Version identifier for the database
 * @param signingKey - Secret key for HMAC signing
 */
export async function generateDatabaseSignature(
  databaseContent: string,
  version: string = '1.0.0',
  signingKey: string = 'client-database-verification-key-2025'
): Promise<DatabaseSignature> {
  const hash = await sha256(databaseContent);
  const timestamp = Date.now();
  const dataToSign = `${hash}:${timestamp}:${version}`;
  const signature = await hmacSha256(signingKey, dataToSign);
  
  return {
    hash,
    signature,
    timestamp,
    version,
  };
}

/**
 * Browser-compatible verification (for client-side use)
 */
export async function verifyDatabaseOnClient(
  databaseUrl: string = '/eHashes/evaluated_phashes.json',
  signatureUrl: string = '/eHashes/database_signature.json'
): Promise<{ valid: boolean; reason?: string; data?: any }> {
  try {
    // Fetch database and signature
    const [dbResponse, sigResponse] = await Promise.all([
      fetch(databaseUrl),
      fetch(signatureUrl)
    ]);

    if (!dbResponse.ok || !sigResponse.ok) {
      return { valid: false, reason: 'Failed to fetch database or signature' };
    }

    const databaseContent = await dbResponse.text();
    const signature: DatabaseSignature = await sigResponse.json();

    // Verify integrity
    const result = await verifyDatabaseIntegrity(databaseContent, signature);
    
    if (result.valid) {
      return { valid: true, data: JSON.parse(databaseContent) };
    }
    
    return result;
  } catch (error) {
    console.error('Database verification error:', error);
    return { valid: false, reason: 'Verification failed: ' + (error as Error).message };
  }
}
