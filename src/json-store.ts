// store.ts
import { readFile, writeFile, mkdir, rename, unlink } from "fs/promises";
import { existsSync } from "fs";
import { dirname, normalize, basename, resolve } from "path";

export class JSONStore {
  private data: Record<string, unknown>;
  private filePath: string;

  constructor(filePath: string) {
    // Prevent path traversal
    if (filePath.includes('..')) {
      throw new Error("Invalid file path");
    }
    
    const normalizedPath = normalize(filePath);
    const resolvedPath = normalize(dirname(normalizedPath) + '/' + basename(normalizedPath));
    const absolutePath = normalize(resolve(normalizedPath));
    const absoluteResolved = normalize(resolve(resolvedPath));
    
    if (normalizedPath !== resolvedPath || absolutePath !== absoluteResolved) {
      throw new Error("Invalid file path");
    }
    this.filePath = normalizedPath;
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
    const tmpPath = `${this.filePath}.tmp`;
    try {
      // Write to temp file first
      await writeFile(tmpPath, JSON.stringify(this.data, null, 2), {
        mode: 0o600, // Secure file permissions
        flag: "wx", // Fail if temp file exists
      });
      // Atomic rename
      await rename(tmpPath, this.filePath);
    } finally {
      // Clean up temp file if it exists
      try {
        await unlink(tmpPath);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // Ignore error if temp file doesn't exist
      }
    }
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
