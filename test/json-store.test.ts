// test/store.test.ts
import { JSONStore } from "../src/json-store";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

jest.mock("fs/promises");
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

  test("throws error on path traversal attempt", () => {
    expect(() => new JSONStore("../test/store.json")).toThrow("Invalid file path");
    expect(() => new JSONStore("test/../store.json")).toThrow("Invalid file path");
  });

  describe("init", () => {
    test("handles file read error", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockRejectedValue(new Error("File read error"));
      await expect(store.init()).rejects.toThrow("File read error");
    });

    test("creates new store file if it doesn't exist", async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      await store.init();
      expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(writeFile).toHaveBeenCalledWith(testPath, "{}");
    });

    test("loads existing store file", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue('{"test": "value"}');
      await store.init();
      expect(readFile).toHaveBeenCalledWith(testPath, "utf-8");
    });

    test("handles JSON parsing error", async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue("invalid json");
      await expect(store.init()).rejects.toThrow(SyntaxError);
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
          flag: "wx",
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
          flag: "wx",
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
  });
});
