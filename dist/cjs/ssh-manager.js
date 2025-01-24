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

// src/ssh-manager.ts
var ssh_manager_exports = {};
__export(ssh_manager_exports, {
  SSHManager: () => SSHManager
});
module.exports = __toCommonJS(ssh_manager_exports);
var import_ssh2 = require("ssh2");
var SSHManager = class {
  store;
  connections;
  constructor(store) {
    this.store = store;
    this.connections = /* @__PURE__ */ new Map();
  }
  async connect(backendId) {
    const backend = await this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");
    const keyPair = await this.store.getKeyPair(backend.keyPairId);
    if (!keyPair) throw new Error("SSH key pair not found");
    const conn = new import_ssh2.Client();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SSHManager
});
