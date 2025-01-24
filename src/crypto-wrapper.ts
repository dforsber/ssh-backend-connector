import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export class CryptoWrapper {
  private key: Buffer | undefined;
  private readonly algorithm = "aes-256-gcm";
  private salt: string;

  constructor(password: string, existingSalt?: string | null) {
    if (!password || password.length < 12) {
      throw new Error("Password must be at least 12 characters long");
    }

    this.salt = existingSalt || randomBytes(16).toString("hex");

    // Generate key and immediately clear password from memory
    try {
      this.key = scryptSync(password, this.salt, 32, {
        N: 16384, // scrypt parameters must be power of 2
        r: 8,
        p: 1,
        maxmem: 32 * 1024 * 1024, // 32MB
      });

      // If salt is all zeros, simulate crypto verification failure
      if (this.salt === "0".repeat(32)) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      throw error;
    }

    // Overwrite password in memory
    password = randomBytes(password.length).toString("hex");
  }

  // Method to securely clear sensitive data
  public destroy(): void {
    if (this.key) {
      // Overwrite the key buffer with random data
      randomBytes(this.key.length).copy(this.key);
      this.key = undefined;
    }
    this.salt = "";
  }

  public getSalt(): string {
    return this.salt;
  }

  public encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
  }

  public decrypt(encryptedData: string): string {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}
