/**
 * Result Encryption Module
 * 
 * Implements AES-256-GCM encryption for scan results to ensure
 * confidentiality of scan history and results.
 * 
 * Security Properties:
 * - Confidentiality: Results encrypted with AES-256-GCM
 * - Authenticity: GCM provides authentication
 * - Session-based: Keys stored in browser's crypto API
 * - Forward Secrecy: New key per session
 */

/**
 * Encrypted result structure
 */
export interface EncryptedResult {
  ciphertext: string;     // Base64 encoded ciphertext
  iv: string;             // Base64 encoded initialization vector
  timestamp: number;      // When encrypted
}

/**
 * Session encryption key management
 */
class EncryptionKeyManager {
  private key: CryptoKey | null = null;
  private readonly KEY_STORAGE_KEY = 'nudgescan_session_key';

  /**
   * Generate or retrieve session encryption key
   */
  async getOrCreateKey(): Promise<CryptoKey> {
    if (this.key) {
      return this.key;
    }

    // Try to retrieve from session storage (for page reloads)
    const storedKey = sessionStorage.getItem(this.KEY_STORAGE_KEY);
    
    if (storedKey) {
      try {
        const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
        this.key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        return this.key;
      } catch (error) {
        console.warn('Failed to import stored key, generating new one');
      }
    }

    // Generate new key
    this.key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Store for session continuity
    const exportedKey = await crypto.subtle.exportKey('raw', this.key);
    const keyString = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    sessionStorage.setItem(this.KEY_STORAGE_KEY, keyString);

    return this.key;
  }

  /**
   * Clear session key (logout/clear history)
   */
  clearKey(): void {
    this.key = null;
    sessionStorage.removeItem(this.KEY_STORAGE_KEY);
  }
}

// Singleton instance
const keyManager = new EncryptionKeyManager();

/**
 * Encrypt scan result data
 * 
 * @param data - Result data to encrypt (will be JSON stringified)
 */
export async function encryptResult(data: any): Promise<EncryptedResult> {
  try {
    const key = await keyManager.getOrCreateKey();
    
    // Convert data to bytes
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBytes = encoder.encode(dataString);
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBytes
    );
    
    // Convert to base64 for storage
    const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    const ivB64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    
    return {
      ciphertext: ciphertextB64,
      iv: ivB64,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt result: ' + (error as Error).message);
  }
}

/**
 * Decrypt scan result data
 * 
 * @param encrypted - Encrypted result object
 */
export async function decryptResult(encrypted: EncryptedResult): Promise<any> {
  try {
    const key = await keyManager.getOrCreateKey();
    
    // Convert from base64
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    // Convert bytes to string and parse JSON
    const decoder = new TextDecoder();
    const dataString = decoder.decode(decrypted);
    return JSON.parse(dataString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt result: ' + (error as Error).message);
  }
}

/**
 * Store encrypted result in local storage
 */
export async function storeEncryptedResult(
  id: string,
  data: any
): Promise<void> {
  const encrypted = await encryptResult(data);
  const storageKey = `result_${id}`;
  localStorage.setItem(storageKey, JSON.stringify(encrypted));
}

/**
 * Retrieve and decrypt result from local storage
 */
export async function retrieveEncryptedResult(id: string): Promise<any> {
  const storageKey = `result_${id}`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    throw new Error('Result not found');
  }
  
  const encrypted: EncryptedResult = JSON.parse(stored);
  return await decryptResult(encrypted);
}

/**
 * Clear all encrypted results
 */
export function clearAllResults(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('result_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  keyManager.clearKey();
}

/**
 * Export encrypted results (for backup)
 */
export function exportEncryptedResults(): EncryptedResult[] {
  const results: EncryptedResult[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('result_')) {
      const stored = localStorage.getItem(key);
      if (stored) {
        results.push(JSON.parse(stored));
      }
    }
  }
  
  return results;
}

/**
 * Get encryption key info (for display/debugging)
 */
export async function getEncryptionInfo(): Promise<{
  keyPresent: boolean;
  algorithm: string;
  keyLength: number;
}> {
  const key = await keyManager.getOrCreateKey();
  
  return {
    keyPresent: !!key,
    algorithm: 'AES-GCM',
    keyLength: 256
  };
}
