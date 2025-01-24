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

// src/json-store.ts
import { readFile, writeFile, mkdir, rename, unlink } from "fs/promises";
import { existsSync } from "fs";
import { dirname, normalize } from "path";
var JSONStore = class {
  data;
  filePath;
  constructor(filePath) {
    try {
      const normalizedPath = normalize(filePath);
      if (filePath.includes("..") || normalizedPath.includes("..")) {
        throw new Error("Invalid file path: contains path traversal");
      }
      if (!/^[a-zA-Z0-9/._-]+$/.test(filePath)) {
        throw new Error("Invalid file path: contains invalid characters");
      }
      this.filePath = normalizedPath;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Invalid file path");
    }
    this.data = {};
  }
  async init() {
    try {
      this.data = await this.loadStore();
    } catch (error) {
      throw error;
    }
  }
  async loadStore() {
    if (!existsSync(this.filePath)) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(this.filePath, "{}");
      return {};
    }
    const content = await readFile(this.filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid store format");
    }
    return parsed;
  }
  async saveStore() {
    const tmpPath = `${this.filePath}.tmp`;
    try {
      await writeFile(tmpPath, JSON.stringify(this.data, null, 2), {
        mode: 384,
        // Secure file permissions
        flag: "wx"
        // Fail if temp file exists
      });
      await rename(tmpPath, this.filePath);
    } finally {
      try {
        await unlink(tmpPath);
      } catch (err) {
      }
    }
  }
  async get(key) {
    return this.data[key] || null;
  }
  async set(key, value) {
    this.data[key] = value;
    await this.saveStore();
  }
  async delete(key) {
    delete this.data[key];
    await this.saveStore();
  }
  async keys() {
    return Object.keys(this.data);
  }
};

// src/ssh-store.ts
var SSHStoreManager = class {
  store;
  crypto;
  constructor(storePath = ".ssh-store/data.json") {
    this.store = new JSONStore(storePath);
  }
  async connect(password) {
    if (!password) throw new Error("Password is required");
    try {
      await this.store.init();
      const salt = await this.store.get("crypto.salt");
      this.crypto = new CryptoWrapper(password, salt);
      if (!salt) await this.store.set("crypto.salt", this.crypto.getSalt());
      const testData = "test";
      const encrypted = this.crypto.encrypt(testData);
      const decrypted = this.crypto.decrypt(encrypted);
      if (decrypted !== testData) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      if (this.crypto) {
        this.crypto.destroy();
        this.crypto = void 0;
      }
      throw error;
    }
  }
  disconnect() {
    if (this.crypto) {
      this.crypto.destroy();
      this.crypto = void 0;
    }
  }
  async saveKeyPair(keyPair) {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
    if (!keyPair.id || !keyPair.privateKey || !keyPair.publicKey) {
      throw new Error("Invalid key pair data");
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(keyPair.id)) {
      throw new Error("Invalid key pair ID format");
    }
    const encrypted = {
      ...keyPair,
      privateKey: this.crypto.encrypt(keyPair.privateKey),
      publicKey: this.crypto.encrypt(keyPair.publicKey)
    };
    await this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }
  async getKeyPair(id) {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
    const encrypted = await this.store.get(`keypairs.${id}`);
    if (!encrypted) return null;
    return {
      id,
      privateKey: this.crypto.decrypt(encrypted.privateKey),
      publicKey: this.crypto.decrypt(encrypted.publicKey)
    };
  }
  // Update other methods to be async
  async saveBackend(backend) {
    await this.store.set(`backends.${backend.id}`, backend);
  }
  async getBackend(id) {
    return this.store.get(`backends.${id}`);
  }
  async getAllBackends() {
    const keys = await this.store.keys();
    const backendKeys = keys.filter((k) => k.startsWith("backends."));
    const backends = await Promise.all(backendKeys.map((k) => this.store.get(k)));
    return backends.filter((b) => b !== null && b !== void 0);
  }
  async deleteBackend(id) {
    await this.store.delete(`backends.${id}`);
  }
  async deleteKeyPair(id) {
    await this.store.delete(`keypairs.${id}`);
  }
  async getAllKeyPairs() {
    const keys = await this.store.keys();
    const keyPairKeys = keys.filter((k) => k.startsWith("keypairs."));
    const keyPairs = await Promise.all(
      keyPairKeys.map((k) => this.getKeyPair(k.replace("keypairs.", "")))
    );
    return keyPairs.filter((k) => k !== null);
  }
};
export {
  SSHStoreManager
};
