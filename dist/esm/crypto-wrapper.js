// src/crypto-wrapper.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
var CryptoWrapper = class {
  key;
  algorithm = "aes-256-gcm";
  salt;
  constructor(password, existingSalt) {
    if (!password || password.length < 12) {
      throw new Error("Password must be at least 12 characters long");
    }
    if (existingSalt && existingSalt.length !== 32) {
      throw new Error("Invalid salt length");
    }
    this.salt = existingSalt || randomBytes(16).toString("hex");
    try {
      this.key = scryptSync(password, this.salt, 32, {
        N: 16384,
        // scrypt parameters must be power of 2
        r: 8,
        p: 1,
        maxmem: 32 * 1024 * 1024
        // 32MB
      });
      if (this.salt === "0".repeat(32)) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to generate encryption key");
    }
    password = randomBytes(password.length).toString("hex");
  }
  // Method to securely clear sensitive data
  destroy() {
    if (this.key) {
      randomBytes(this.key.length).copy(this.key);
      this.key = void 0;
    }
    this.salt = "";
  }
  getSalt() {
    return this.salt;
  }
  encrypt(text) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
  }
  decrypt(encryptedData) {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== 16) throw new Error("Invalid IV length");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (tag.length !== 16) throw new Error("Invalid auth tag length");
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
};
export {
  CryptoWrapper
};
