var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SSHManager: () => SSHManager,
  SSHStoreManager: () => SSHStoreManager
});
module.exports = __toCommonJS(index_exports);

// src/ssh-manager.ts
var import_ssh2 = require("ssh2");
var SSHManager = class {
  store;
  connections;
  maxConnectionAttempts = 3;
  attemptResetTimeMs = 3e5;
  // 5 minutes
  connectionTimeout;
  maxConcurrentConnections;
  connectionAttempts;
  constructor(store, config) {
    this.store = store;
    this.connections = /* @__PURE__ */ new Map();
    this.connectionAttempts = /* @__PURE__ */ new Map();
    this.connectionTimeout = config?.connectionTimeout ?? 3e4;
    this.maxConcurrentConnections = config?.maxConcurrentConnections ?? 10;
  }
  checkRateLimit(backendId) {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(backendId);
    if (attempts) {
      if (now - attempts.lastAttempt > this.attemptResetTimeMs) {
        this.connectionAttempts.set(backendId, { count: 1, lastAttempt: now });
        return;
      }
      if (attempts.count >= this.maxConnectionAttempts) {
        throw new Error("Too many connection attempts. Please try again later.");
      }
      this.connectionAttempts.set(backendId, {
        count: attempts.count + 1,
        lastAttempt: now
      });
    } else {
      this.connectionAttempts.set(backendId, { count: 1, lastAttempt: now });
    }
  }
  async connect(backendId) {
    this.checkRateLimit(backendId);
    if (this.connections.size >= this.maxConcurrentConnections) {
      throw new Error(`Maximum concurrent connections (${this.maxConcurrentConnections}) reached`);
    }
    const backend = await this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");
    const keyPair = await this.store.getKeyPair(backend.keyPairId);
    if (!keyPair) throw new Error("SSH key pair not found");
    const conn = new import_ssh2.Client();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        conn.end();
        reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
      }, this.connectionTimeout);
      conn.on("ready", async () => {
        clearTimeout(timeoutId);
        await this.setupTunnels(conn, backend.host, backend.tunnels ?? []).catch(
          (err) => reject(err)
        );
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
  async setupTunnels(conn, backendHost, tunnelConfigs) {
    try {
      return await Promise.all(
        tunnelConfigs.map(
          (config) => new Promise((resolve, reject) => {
            conn.forwardOut(
              "127.0.0.1",
              config.localPort,
              backendHost,
              config.remotePort,
              (err, channel) => err ? reject(err) : resolve(channel)
            );
          })
        )
      );
    } catch (err) {
      throw err;
    }
  }
  disconnect(backendId) {
    const conn = this.connections.get(backendId);
    if (conn) {
      conn.end();
      this.connections.delete(backendId);
    }
  }
};

// src/crypto-wrapper.ts
var import_node_crypto = require("node:crypto");
var CryptoWrapper = class {
  key;
  algorithm = "aes-256-gcm";
  salt;
  validatePasswordComplexity(password) {
    if (password.length > 128) throw new Error("Password must not exceed 128 characters");
    if (!/[A-Z]/.test(password)) throw new Error("Password must contain uppercase letters");
    if (!/[a-z]/.test(password)) throw new Error("Password must contain lowercase letters");
    if (!/[0-9]/.test(password)) throw new Error("Password must contain numbers");
    if (!/[^A-Za-z0-9]/.test(password)) throw new Error("Password must contain special characters");
  }
  constructor(password, existingSalt) {
    if (!password || password.length < 12) {
      throw new Error("Password must be at least 12 characters long");
    }
    this.validatePasswordComplexity(password);
    if (existingSalt && existingSalt.length !== 32) {
      throw new Error("Invalid salt length");
    }
    this.salt = existingSalt || (0, import_node_crypto.randomBytes)(16).toString("hex");
    try {
      this.key = (0, import_node_crypto.scryptSync)(password, this.salt, 32, {
        N: 16384,
        // CPU/memory cost parameter (must be power of 2)
        r: 8,
        // Block size parameter
        p: 1,
        // Parallelization parameter
        maxmem: 32 * 1024 * 1024
        // 32MB memory limit
      });
      if (this.salt === "0".repeat(32)) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate encryption key: ${error}`);
    }
    password = (0, import_node_crypto.randomBytes)(password.length).toString("hex");
  }
  // Method to securely clear sensitive data
  destroy() {
    if (this.key) {
      (0, import_node_crypto.randomBytes)(this.key.length).copy(this.key);
      this.key = void 0;
    }
    this.salt = "";
  }
  getSalt() {
    return this.salt;
  }
  encrypt(text) {
    const iv = (0, import_node_crypto.randomBytes)(16);
    const cipher = (0, import_node_crypto.createCipheriv)(this.algorithm, this.key, iv);
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
    const decipher = (0, import_node_crypto.createDecipheriv)(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
};

// src/json-store.ts
var import_promises = require("fs/promises");
var import_fs = require("fs");
var import_path = require("path");
var JSONStore = class _JSONStore {
  data;
  filePath;
  maxFileSizeBytes;
  static DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024;
  // 200MB
  constructor(filePath, maxFileSizeBytes = _JSONStore.DEFAULT_MAX_FILE_SIZE) {
    this.maxFileSizeBytes = maxFileSizeBytes;
    try {
      const normalizedPath = (0, import_path.normalize)(filePath);
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
  async verifyFilePermissions(filepath) {
    try {
      const stats = await (0, import_promises.stat)(filepath);
      if (!stats) throw new Error("File read error");
      if ((stats.mode & 511) !== 384) {
        throw new Error("Insecure file permissions detected - expected 0600");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Insecure file permissions")) {
          throw error;
        }
      }
      throw error;
    }
  }
  async loadStore() {
    if (!(0, import_fs.existsSync)(this.filePath)) {
      const dir = (0, import_path.dirname)(this.filePath);
      if (!(0, import_fs.existsSync)(dir)) await (0, import_promises.mkdir)(dir, { recursive: true });
      await (0, import_promises.writeFile)(this.filePath, "{}", { mode: 384 });
    }
    await this.verifyFilePermissions(this.filePath);
    const content = await (0, import_promises.readFile)(this.filePath, "utf-8");
    const parsed = JSON.parse(content.toString());
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid store format");
    }
    return parsed;
  }
  async saveStore() {
    const tmpPath = `${this.filePath}.tmp`;
    const jsonData = JSON.stringify(this.data, null, 2);
    try {
      await (0, import_promises.writeFile)(tmpPath, jsonData, {
        mode: 384,
        // Secure file permissions
        flag: "wx"
        // Fail if temp file exists
      });
      await (0, import_promises.rename)(tmpPath, this.filePath);
    } finally {
      try {
        await (0, import_promises.unlink)(tmpPath);
      } catch (err) {
      }
    }
  }
  async get(key) {
    return this.data[key] || null;
  }
  async set(key, value) {
    const newData = { ...this.data, [key]: value };
    const jsonData = JSON.stringify(newData, null, 2);
    const byteSize = Buffer.byteLength(jsonData, "utf8");
    if (byteSize > this.maxFileSizeBytes) {
      throw new Error(
        `File size (${byteSize} bytes) exceeds maximum allowed size (${this.maxFileSizeBytes} bytes)`
      );
    }
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
  isConnected() {
    return this.crypto != void 0;
  }
  disconnect() {
    if (this.crypto) {
      this.crypto.destroy();
      this.crypto = void 0;
    }
  }
  async saveKeyPair(keyPair) {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
    if (!keyPair.id || !keyPair.privateKey) {
      throw new Error("Invalid key pair data");
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(keyPair.id)) {
      throw new Error("Invalid key pair ID format");
    }
    const encrypted = {
      ...keyPair,
      privateKey: this.crypto.encrypt(keyPair.privateKey)
    };
    await this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }
  async getKeyPair(id) {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
    const encrypted = await this.store.get(`keypairs.${id}`);
    if (!encrypted) return null;
    return {
      id,
      privateKey: this.crypto.decrypt(encrypted.privateKey)
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SSHManager,
  SSHStoreManager
});
