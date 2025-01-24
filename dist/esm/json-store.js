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
export {
  JSONStore
};
