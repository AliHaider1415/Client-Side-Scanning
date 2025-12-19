/**
 * Script to generate database signature
 * Standalone JavaScript version
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Compute SHA-256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute HMAC-SHA256 signature
 */
function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Generate signature for database
 */
function generateDatabaseSignature(
  databaseContent,
  version = '1.0.0',
  signingKey = 'client-database-verification-key-2025'
) {
  const hash = sha256(databaseContent);
  const timestamp = Date.now();
  const dataToSign = `${hash}:${timestamp}:${version}`;
  const signature = hmacSha256(signingKey, dataToSign);
  
  return {
    hash,
    signature,
    timestamp,
    version,
  };
}

// Main execution
const dbPath = path.join(process.cwd(), 'public', 'eHashes', 'evaluated_phashes.json');
const sigPath = path.join(process.cwd(), 'public', 'eHashes', 'database_signature.json');

try {
  // Read database
  const databaseContent = fs.readFileSync(dbPath, 'utf-8');
  
  // Generate signature
  const signature = generateDatabaseSignature(databaseContent);
  
  // Write signature file
  fs.writeFileSync(sigPath, JSON.stringify(signature, null, 2));
  
  console.log('✅ Database signature generated successfully!');
  console.log('📄 Signature file:', sigPath);
  console.log('📊 Signature details:', signature);
} catch (error) {
  console.error('❌ Error generating signature:', error);
  process.exit(1);
}
