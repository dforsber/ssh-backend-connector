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
export {
  JSONStore
};
