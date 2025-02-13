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
var import_node_net = require("node:net");
var SSHManager = class {
  store;
  maxConnectionAttempts;
  attemptResetTimeMs;
  connectionTimeout;
  maxConcurrentConnections;
  connectionAttempts;
  connections = /* @__PURE__ */ new Map();
  listeningServers = /* @__PURE__ */ new Map();
  constructor(store, config) {
    this.store = store;
    this.connections = /* @__PURE__ */ new Map();
    this.connectionAttempts = /* @__PURE__ */ new Map();
    this.connectionTimeout = config?.connectionTimeout ?? 3e4;
    this.maxConcurrentConnections = config?.maxConcurrentConnections ?? 10;
    this.maxConnectionAttempts = config?.maxConnectionAttempts ?? 5;
    this.attemptResetTimeMs = config?.attemptResetTimeMs ?? 1e4;
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
    const connParams = {
      host: backend.host,
      port: backend.port,
      username: backend.username,
      privateKey: keyPair.privateKey,
      // debug: (m) => console.log(m),
      readyTimeout: this.connectionTimeout,
      keepaliveInterval: 1e4,
      keepaliveCountMax: 3,
      tryKeyboard: false,
      algorithms: {
        kex: ["curve25519-sha256@libssh.org", "ecdh-sha2-nistp256", "diffie-hellman-group14-sha1"],
        cipher: ["aes128-gcm@openssh.com", "aes256-gcm@openssh.com", "aes128-ctr"],
        compress: ["none"]
      }
    };
    conn.on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
      console.log("Keyboard interactive auth requested");
      finish([]);
    });
    conn.on("handshake", (negotiated) => {
      console.log("SSH Handshake completed", negotiated);
    });
    conn.on("close", () => {
      console.log("Connection closed");
      this.connections.delete(backendId);
    });
    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          console.log("Connection timeout triggered");
          isResolved = true;
          conn.end();
          reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
        }
      }, this.connectionTimeout);
      conn.on("ready", async () => {
        console.log("Connection ready event fired");
        clearTimeout(timeoutId);
        if (isResolved) return;
        try {
          console.log("Setting up tunnels...");
          await this.setupTunnels(conn, backend.id, backend.host, backend.tunnels ?? []);
          console.log("Tunnels setup completed");
          this.connections.set(backendId, conn);
          isResolved = true;
          resolve(conn);
        } catch (err) {
          console.error("Error in tunnel setup:", err);
          if (!isResolved) {
            isResolved = true;
            conn.end();
            reject(err);
          }
        }
      }).on("error", (err) => {
        console.error("Connection error:", err);
        clearTimeout(timeoutId);
        if (!isResolved) {
          isResolved = true;
          conn.end();
          reject(err);
        }
      }).connect(connParams);
      console.log("Connection attempt initiated");
    });
  }
  async setupTunnels(conn, backendId, backendHost, tunnelConfigs) {
    try {
      return await Promise.all(
        tunnelConfigs.map(
          (config, ind) => new Promise((resolve, reject) => {
            try {
              conn.forwardOut(
                "127.0.0.1",
                config.localPort,
                "localhost",
                config.remotePort,
                (err, stream) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  const serv = (0, import_node_net.createServer)((sock) => {
                    sock.setNoDelay(true);
                    sock.pipe(stream).pipe(sock);
                  });
                  serv.listen(config.localPort, () => {
                    const connStr = `${config.localPort}:${backendHost}:${config.remotePort}`;
                    this.listeningServers.set(`${backendId}:${ind}`, serv);
                    resolve(connStr);
                  });
                }
              );
            } catch (err) {
              reject(err);
            }
          })
        )
      );
    } catch (err) {
      this.closeTunnels(backendId);
      throw err;
    }
  }
  // Add this cleanup method
  closeTunnels(backendId) {
    for (const [key, server] of this.listeningServers.entries()) {
      if (key.startsWith(`${backendId}:`)) {
        if (server?.close) server?.close();
        this.listeningServers.delete(key);
      }
    }
  }
  disconnectAll() {
    try {
      const conns = Array.from(this.connections);
      const listeners = Array.from(this.listeningServers);
      conns.map((c) => c?.[1]?.end());
      listeners.map((s) => s?.[1]?.close());
    } catch (err) {
    }
  }
  disconnect(backendId) {
    const conn = this.connections.get(backendId);
    if (conn) {
      conn.end();
      this.connections.delete(backendId);
    }
    const keys = Array.from(this.listeningServers).filter((k) => k[0].startsWith(backendId));
    keys.map((k) => k?.[1].close());
    keys.map((k) => this.listeningServers.delete(k[0]));
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
var import_node_path = require("node:path");

// node_modules/async-mutex/index.mjs
var E_TIMEOUT = new Error("timeout while waiting for mutex to become available");
var E_ALREADY_LOCKED = new Error("mutex already locked");
var E_CANCELED = new Error("request for lock canceled");
var __awaiter$2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Semaphore = class {
  constructor(_value, _cancelError = E_CANCELED) {
    this._value = _value;
    this._cancelError = _cancelError;
    this._queue = [];
    this._weightedWaiters = [];
  }
  acquire(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    return new Promise((resolve, reject) => {
      const task = { resolve, reject, weight, priority };
      const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
      if (i === -1 && weight <= this._value) {
        this._dispatchItem(task);
      } else {
        this._queue.splice(i + 1, 0, task);
      }
    });
  }
  runExclusive(callback_1) {
    return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
      const [value, release] = yield this.acquire(weight, priority);
      try {
        return yield callback(value);
      } finally {
        release();
      }
    });
  }
  waitForUnlock(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    if (this._couldLockImmediately(weight, priority)) {
      return Promise.resolve();
    } else {
      return new Promise((resolve) => {
        if (!this._weightedWaiters[weight - 1])
          this._weightedWaiters[weight - 1] = [];
        insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
      });
    }
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(value) {
    this._value = value;
    this._dispatchQueue();
  }
  release(weight = 1) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    this._value += weight;
    this._dispatchQueue();
  }
  cancel() {
    this._queue.forEach((entry) => entry.reject(this._cancelError));
    this._queue = [];
  }
  _dispatchQueue() {
    this._drainUnlockWaiters();
    while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
      this._dispatchItem(this._queue.shift());
      this._drainUnlockWaiters();
    }
  }
  _dispatchItem(item) {
    const previousValue = this._value;
    this._value -= item.weight;
    item.resolve([previousValue, this._newReleaser(item.weight)]);
  }
  _newReleaser(weight) {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      this.release(weight);
    };
  }
  _drainUnlockWaiters() {
    if (this._queue.length === 0) {
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        waiters.forEach((waiter) => waiter.resolve());
        this._weightedWaiters[weight - 1] = [];
      }
    } else {
      const queuedPriority = this._queue[0].priority;
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
        (i === -1 ? waiters : waiters.splice(0, i)).forEach((waiter) => waiter.resolve());
      }
    }
  }
  _couldLockImmediately(weight, priority) {
    return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
  }
};
function insertSorted(a, v) {
  const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
  a.splice(i + 1, 0, v);
}
function findIndexFromEnd(a, predicate) {
  for (let i = a.length - 1; i >= 0; i--) {
    if (predicate(a[i])) {
      return i;
    }
  }
  return -1;
}
var __awaiter$1 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Mutex = class {
  constructor(cancelError) {
    this._semaphore = new Semaphore(1, cancelError);
  }
  acquire() {
    return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
      const [, releaser] = yield this._semaphore.acquire(1, priority);
      return releaser;
    });
  }
  runExclusive(callback, priority = 0) {
    return this._semaphore.runExclusive(() => callback(), 1, priority);
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock(priority = 0) {
    return this._semaphore.waitForUnlock(1, priority);
  }
  release() {
    if (this._semaphore.isLocked())
      this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
};

// src/json-store.ts
var mutex = new Mutex();
var JSONStore = class _JSONStore {
  data;
  filePath;
  maxFileSizeBytes;
  static DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024;
  // 200MB
  constructor(filePath, maxFileSizeBytes = _JSONStore.DEFAULT_MAX_FILE_SIZE) {
    this.maxFileSizeBytes = maxFileSizeBytes;
    try {
      const normalizedPath = (0, import_node_path.normalize)(filePath);
      if (filePath.includes("..") || normalizedPath.includes("..")) {
        throw new Error("Invalid file path: contains path traversal");
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
      if ((stats.mode & 511) !== 384 && process.platform !== "win32") {
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
      const dir = (0, import_node_path.dirname)(this.filePath);
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
    await mutex.runExclusive(async () => {
      const tmpPath = `${this.filePath}.tmp`;
      const jsonData = JSON.stringify(this.data, null, 2);
      try {
        await (0, import_promises.writeFile)(tmpPath, jsonData, {
          mode: 384,
          // Secure file permissions
          flag: "w"
          // NOT Fail if temp file exists
        });
        await (0, import_promises.rename)(tmpPath, this.filePath);
      } finally {
        try {
          await (0, import_promises.unlink)(tmpPath);
        } catch (err) {
        }
      }
    });
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
var import_node_path2 = require("node:path");
var import_node_os = require("node:os");
var HOMEDIR = (0, import_node_os.homedir)();
var DEFAULT_STORE = (0, import_node_path2.join)(HOMEDIR, ".ssh-store/data.json");
var SSHStoreManager = class {
  store;
  crypto;
  constructor(storePath = DEFAULT_STORE) {
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
