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
    this.filePath = filePath;
    this.data = {};
  }
  async init() {
    this.data = await this.loadStore();
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
    return JSON.parse(content);
  }
  async saveStore() {
    await (0, import_promises.writeFile)(this.filePath, JSON.stringify(this.data, null, 2));
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
