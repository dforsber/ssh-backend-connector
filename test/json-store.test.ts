// test/store.test.ts
import { JSONStore } from "../src/json-store";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  rename: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn().mockResolvedValue({ mode: 0o600 }), // Mock stat to return correct permissions
}));
jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

describe("JSONStore", () => {
  let store: JSONStore;
  const testPath = "test/store.json";

  beforeEach(() => {
    store = new JSONStore(testPath);
    jest.clearAllMocks();
  });

  describe("constructor validation", () => {
    test("throws error on path traversal attempt", () => {
      expect(() => new JSONStore("../test/store.json")).toThrow("contains path traversal");
      expect(() => new JSONStore("test/../store.json")).toThrow("contains path traversal");
    });

    test("accepts valid paths", () => {
      expect(() => new JSONStore("test/store.json")).not.toThrow();
      expect(() => new JSONStore("test/sub-dir/store.json")).not.toThrow();
      expect(() => new JSONStore("test/sub_dir/store.json")).not.toThrow();
    });

    test("handles non-Error constructor failures", () => {
      // Mock normalize to throw a non-Error object
      jest.spyOn(require("path"), "normalize").mockImplementationOnce(() => {
        throw "Not an error object";
      });

      expect(() => new JSONStore("test/store.json")).toThrow("Invalid file path");
    });
  });

  describe("init", () => {
    test("throws error when file permissions are insecure", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (stat as jest.Mock).mockResolvedValue({ mode: 0o644 }); // Wrong permissions
      await expect(store.init()).rejects.toThrow(
        "Insecure file permissions detected - expected 0600"
      );
    });

    test("accepts file with correct permissions", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (stat as jest.Mock).mockResolvedValue({ mode: 0o600 }); // Correct permissions
      (readFile as jest.Mock).mockResolvedValue("{}");
      await expect(store.init()).resolves.not.toThrow();
    });

    test("handles null stats object", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (stat as jest.Mock).mockResolvedValue(null);
      await expect(store.init()).rejects.toThrow("File read error");
    });

    test("handles file read error", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockRejectedValue(new Error("File read error"));
      await expect(store.init()).rejects.toThrow("File read error");
    });

    test("creates new store file if it doesn't exist", async () => {
      (existsSync as jest.Mock).mockReturnValueOnce(false);
      (existsSync as jest.Mock).mockReturnValueOnce(false);
      (readFile as jest.Mock).mockReturnValueOnce(Buffer.from("{}"));
      (stat as jest.Mock).mockReturnValueOnce({ mode: 0o600 });
      await store.init();
      expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(writeFile).toHaveBeenCalledWith(testPath, "{}", { mode: 0o600 });
    });

    test("handles directory creation error", async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdir as jest.Mock).mockRejectedValue(new Error("Permission denied"));
      await expect(store.init()).rejects.toThrow("Permission denied");
    });

    test("loads existing store file", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (stat as jest.Mock).mockResolvedValue({ mode: 0o600 }); // Correct permissions
      (readFile as jest.Mock).mockResolvedValue('{"test": "value"}');
      await store.init();
      expect(readFile).toHaveBeenCalledWith(testPath, "utf-8");
    });

    test("handles JSON parsing error", async () => {
      // Mock existsSync to return true (file exists)
      (existsSync as jest.Mock).mockReturnValue(true);

      // Mock stat to return valid permissions
      (stat as jest.Mock).mockResolvedValue({ mode: 0o600 });

      // Mock readFile to return invalid JSON
      (readFile as jest.Mock).mockResolvedValue("invalid json");

      await expect(store.init()).rejects.toThrow(SyntaxError);

      // Test with corrupted JSON that might parse but is not an object
      (readFile as jest.Mock).mockResolvedValue('"not an object"');
      await expect(store.init()).rejects.toThrow("Invalid store format");
    });
  });

  describe("operations", () => {
    beforeEach(async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue("{}");
      await store.init();
    });

    test("sets and gets value", async () => {
      await store.set("test", { value: "test" });
      expect(writeFile).toHaveBeenCalledWith(
        `${testPath}.tmp`,
        expect.any(String),
        expect.objectContaining({
          mode: 0o600,
          flag: "w",
        })
      );
      const value = await store.get("test");
      expect(value).toEqual({ value: "test" });
    });

    test("returns null for nonexistent key", async () => {
      const value = await store.get("nonexistent");
      expect(value).toBeNull();
    });

    test("deletes value", async () => {
      await store.set("test", { value: "test" });
      await store.delete("test");
      expect(writeFile).toHaveBeenCalledWith(
        `${testPath}.tmp`,
        expect.any(String),
        expect.objectContaining({
          mode: 0o600,
          flag: "w",
        })
      );
      const value = await store.get("test");
      expect(value).toBeNull();
    });

    test("lists keys", async () => {
      await store.set("test1", { value: "test1" });
      await store.set("test2", { value: "test2" });
      const keys = await store.keys();
      expect(keys).toEqual(["test1", "test2"]);
    });

    test("throws error when file size exceeds limit", async () => {
      // Create store with 50 byte limit
      const smallStore = new JSONStore(testPath, 50);
      await smallStore.init();

      // Should succeed - small data (under 50 bytes when stringified)
      await smallStore.set("key", { value: "test" });

      // Should fail - data that will exceed 50 bytes when stringified with formatting
      const largeData = { value: "x".repeat(30) }; // Results in JSON > 50 bytes with formatting
      await expect(smallStore.set("large", largeData)).rejects.toThrow(
        /File size .* exceeds maximum allowed size \(50 bytes\)/
      );

      // Verify the actual size that caused the failure
      const existingData = (await smallStore.get("key")) as Record<string, unknown>;
      const jsonData = JSON.stringify({ ...existingData, large: largeData }, null, 2);
      expect(Buffer.byteLength(jsonData, "utf8")).toBeGreaterThan(50);
    });
  });
});
