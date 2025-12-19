/**
 * Generate server public key commitment
 */

import { p256 } from '@noble/curves/nist.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_OPRF_KEY = BigInt(
  process.env.SERVER_OPRF_KEY || "123456789012345678901234567890123456789"
);

// Correct way to access the generator point
const G = p256.Point.BASE;
const publicKey = G.multiply(SERVER_OPRF_KEY);

const commitment = {
  publicKey: publicKey.toHex(),
  timestamp: Date.now(),
  version: '1.0.0'
};

const outputPath = path.join(__dirname, '..', 'public', 'server_key_commitment.json');
fs.writeFileSync(outputPath, JSON.stringify(commitment, null, 2));

console.log('✅ Server key commitment generated!');
console.log('📄 File:', outputPath);
console.log('📊 Commitment:', commitment);
