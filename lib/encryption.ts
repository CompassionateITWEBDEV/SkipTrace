// Data encryption utilities for sensitive fields
// In production, use a proper encryption library like crypto-js or node:crypto

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits

/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || "default-key-change-in-production-32-chars!!"
  
  // Ensure key is exactly 32 bytes
  if (key.length < KEY_LENGTH) {
    return Buffer.from(key.padEnd(KEY_LENGTH, "0"))
  }
  return Buffer.from(key.substring(0, KEY_LENGTH))
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    
    const authTag = cipher.getAuthTag()
    
    // Return IV + authTag + encrypted data (all hex encoded)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt data")
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const [ivHex, authTagHex, encrypted] = encryptedData.split(":")
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted data format")
    }
    
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Hash data (one-way, for passwords, etc.)
 */
export function hash(data: string): string {
  return createHash("sha256").update(data).digest("hex")
}

/**
 * Hash with salt
 */
export function hashWithSalt(data: string, salt: string): string {
  return createHash("sha256").update(data + salt).digest("hex")
}

/**
 * Generate a random salt
 */
export function generateSalt(): string {
  return randomBytes(16).toString("hex")
}
