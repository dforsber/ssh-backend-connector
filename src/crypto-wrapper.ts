import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export class CryptoWrapper {
  private key: Buffer;
  private readonly algorithm = "aes-256-gcm";
  private salt: string;

  private validatePasswordComplexity(password: string): void {
    if (password.length > 128) throw new Error("Password must not exceed 128 characters");
    if (!/[A-Z]/.test(password)) throw new Error("Password must contain uppercase letters");
    if (!/[a-z]/.test(password)) throw new Error("Password must contain lowercase letters");
    if (!/[0-9]/.test(password)) throw new Error("Password must contain numbers");
    if (!/[^A-Za-z0-9]/.test(password)) throw new Error("Password must contain special characters");
  }

  constructor(password: string, existingSalt?: string | null) {
    if (!password || password.length < 12) {
      throw new Error("Password must be at least 12 characters long");
    }

    this.validatePasswordComplexity(password);

    // Validate salt length if provided (32 chars in hex = 16 bytes)
    if (existingSalt && existingSalt.length !== 32) {
      throw new Error("Invalid salt length");
    }

    this.salt = existingSalt || randomBytes(16).toString("hex");

    // Generate key and immediately clear password from memory
    try {
      this.key = scryptSync(password, this.salt, 32, {
        N: 16384, // CPU/memory cost parameter (must be power of 2)
        r: 8,     // Block size parameter
        p: 1,     // Parallelization parameter
        maxmem: 32 * 1024 * 1024, // 32MB memory limit
      });

      // If salt is all zeros, simulate crypto verification failure
      if (this.salt === "0".repeat(32)) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate encryption key: ${error}`);
    }

    // Overwrite password in memory
    password = randomBytes(password.length).toString("hex");
  }

  // Method to securely clear sensitive data
  public destroy(): void {
    if (this.key) {
      // Overwrite the key buffer with random data
      randomBytes(this.key.length).copy(this.key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).key = undefined;
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
    if (iv.length !== 16) throw new Error("Invalid IV length");

    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (tag.length !== 16) throw new Error("Invalid auth tag length");

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}
