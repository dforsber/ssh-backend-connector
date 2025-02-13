// store.ts
import { readFile, writeFile, mkdir, rename, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import { dirname, normalize } from "node:path";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

export class JSONStore {
  private data: Record<string, unknown>;
  private filePath: string;
  private readonly maxFileSizeBytes: number;
  private static readonly DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

  constructor(filePath: string, maxFileSizeBytes = JSONStore.DEFAULT_MAX_FILE_SIZE) {
    // Prevent path traversal and other invalid paths
    this.maxFileSizeBytes = maxFileSizeBytes;
    try {
      const normalizedPath = normalize(filePath);

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

  async init(): Promise<void> {
    try {
      this.data = await this.loadStore();
    } catch (error) {
      // Ensure error is propagated
      throw error;
    }
  }

  private async verifyFilePermissions(filepath: string): Promise<void> {
    try {
      const stats = await stat(filepath);
      if (!stats) throw new Error("File read error");
      if ((stats.mode & 0o777) !== 0o600 && process.platform !== "win32") {
        throw new Error("Insecure file permissions detected - expected 0600");
      }
    } catch (error) {
      // Only wrap permission errors as-is
      if (error instanceof Error) {
        // Propagate permission errors as-is
        if (error.message.includes("Insecure file permissions")) {
          throw error;
        }
      }
      // Propagate the original error
      throw error;
    }
  }

  private async loadStore(): Promise<Record<string, unknown>> {
    if (!existsSync(this.filePath)) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(this.filePath, "{}", { mode: 0o600 });
    }
    await this.verifyFilePermissions(this.filePath);
    const content = await readFile(this.filePath, "utf-8");
    const parsed = JSON.parse(content.toString());
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid store format");
    }
    return parsed;
  }

  private async saveStore(): Promise<void> {
    await mutex.runExclusive(async () => {
      const tmpPath = `${this.filePath}.tmp`;
      const jsonData = JSON.stringify(this.data, null, 2);

      try {
        // Write to temp file first
        await writeFile(tmpPath, jsonData, {
          mode: 0o600, // Secure file permissions
          flag: "w", // NOT Fail if temp file exists
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
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.data[key] as T) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Create a copy of data with the new value to check total size
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

  async delete(key: string): Promise<void> {
    delete this.data[key];
    await this.saveStore();
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }
}
