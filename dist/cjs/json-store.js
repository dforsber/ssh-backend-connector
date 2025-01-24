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

// src/json-store.ts
var json_store_exports = {};
__export(json_store_exports, {
  JSONStore: () => JSONStore
});
module.exports = __toCommonJS(json_store_exports);
var import_promises = require("fs/promises");
var import_fs = require("fs");
var import_path = require("path");
var JSONStore = class {
  data;
  filePath;
  constructor(filePath) {
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
  async loadStore() {
    if (!(0, import_fs.existsSync)(this.filePath)) {
      const dir = (0, import_path.dirname)(this.filePath);
      if (!(0, import_fs.existsSync)(dir)) {
        await (0, import_promises.mkdir)(dir, { recursive: true });
      }
      await (0, import_promises.writeFile)(this.filePath, "{}");
      return {};
    }
    const content = await (0, import_promises.readFile)(this.filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid store format");
    }
    return parsed;
  }
  async saveStore() {
    const tmpPath = `${this.filePath}.tmp`;
    try {
      await (0, import_promises.writeFile)(tmpPath, JSON.stringify(this.data, null, 2), {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JSONStore
});
