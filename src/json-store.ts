// store.ts
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname } from "path";

export class JSONStore {
  private data: Record<string, unknown>;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = {};
  }

  async init(): Promise<void> {
    this.data = await this.loadStore();
  }

  private async loadStore(): Promise<Record<string, unknown>> {
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

  private async saveStore(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.data[key] as T) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data[key] = value;
    await this.saveStore();
  }

  async delete(key: string): Promise<void> {
    delete this.data[key];
    await this.saveStore();
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }
}
