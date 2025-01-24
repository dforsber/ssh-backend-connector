// src/ssh-manager.ts
import { Client } from "ssh2";

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

// src/ssh-manager.ts
var SSHManager = class {
  store;
  connections;
  constructor(cryptoConfig, store) {
    this.store = store || new SSHStoreManager(cryptoConfig);
    this.connections = /* @__PURE__ */ new Map();
  }
  async connect(backendId) {
    const backend = await this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");
    const keyPair = await this.store.getKeyPair(backend.keyPairId);
    if (!keyPair) throw new Error("SSH key pair not found");
    const conn = new Client();
    return new Promise((resolve, reject) => {
      conn.on("ready", () => {
        this.connections.set(backendId, conn);
        resolve(conn);
      }).on("error", (err) => {
        reject(err);
      }).connect({
        host: backend.host,
        port: backend.port,
        username: backend.username,
        privateKey: keyPair.privateKey
      });
    });
  }
  async setupTunnel(backendId, config) {
    const conn = this.connections.get(backendId);
    if (!conn) throw new Error("Not connected");
    const { remotePort, localPort, remoteHost = "127.0.0.1" } = config;
    return new Promise((resolve, reject) => {
      try {
        conn.forwardIn(remoteHost, remotePort, (err) => {
          if (err) {
            reject(err);
          } else {
            conn.forwardOut("127.0.0.1", localPort, remoteHost, remotePort, (err2, channel) => {
              if (err2) reject(err2);
              else resolve(channel);
            });
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  disconnect(backendId) {
    const conn = this.connections.get(backendId);
    if (conn) {
      conn.end();
      this.connections.delete(backendId);
    }
  }
};
export {
  SSHManager,
  SSHStoreManager
};
