// src/crypto-wrapper.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
var CryptoWrapper = class {
  key;
  algorithm = "aes-256-gcm";
  constructor(props) {
    this.key = scryptSync(props.secretKey, props.salt, 32);
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
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
};

// src/json-store.ts
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname } from "path";
var JSONStore = class {
  data;
  filePath;
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
  }
  async init() {
    this.data = await this.loadStore();
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
    return JSON.parse(content);
  }
  async saveStore() {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
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
  constructor(cryptoConfig, storePath = ".ssh-store/data.json") {
    this.store = new JSONStore(storePath);
    this.crypto = new CryptoWrapper(cryptoConfig);
  }
  async init() {
    await this.store.init();
  }
  async saveKeyPair(keyPair) {
    const encrypted = {
      ...keyPair,
      privateKey: this.crypto.encrypt(keyPair.privateKey),
      publicKey: this.crypto.encrypt(keyPair.publicKey)
    };
    await this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }
  async getKeyPair(id) {
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
};
export {
  SSHStoreManager
};
