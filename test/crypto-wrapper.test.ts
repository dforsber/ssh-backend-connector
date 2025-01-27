import { CryptoWrapper } from "../src/crypto-wrapper";
import { scryptSync } from "node:crypto";

jest.mock("node:crypto", () => ({
  ...jest.requireActual("node:crypto"),
  scryptSync: jest.fn(),
}));

describe("CryptoWrapper", () => {
  const validPassword = "test-Password-12+";
  let wrapper: CryptoWrapper;
  const mockScryptSync = scryptSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful key generation
    mockScryptSync.mockReturnValue(Buffer.from("test-key".repeat(4)));
    wrapper = new CryptoWrapper(validPassword);
  });

  describe("password complexity validation", () => {
    test("throws when password lacks uppercase letters", () => {
      expect(() => new CryptoWrapper("test-password-12+")).toThrow(
        "Password must contain uppercase letters"
      );
    });

    test("throws when password lacks lowercase letters", () => {
      expect(() => new CryptoWrapper("TEST-PASSWORD-12+")).toThrow(
        "Password must contain lowercase letters"
      );
    });

    test("throws when password lacks numbers", () => {
      expect(() => new CryptoWrapper("Test-Password-Plus+")).toThrow(
        "Password must contain numbers"
      );
    });

    test("throws when password lacks special characters", () => {
      expect(() => new CryptoWrapper("TestPassword123")).toThrow(
        "Password must contain special characters"
      );
    });

    test("accepts password with all required character types", () => {
      expect(() => new CryptoWrapper("Test-Password-123+")).not.toThrow();
    });
  });

  test("encrypts and decrypts data correctly", () => {
    const testData = "test-data";
    const encrypted = wrapper.encrypt(testData);
    expect(encrypted).toContain(":");
    const decrypted = wrapper.decrypt(encrypted);
    expect(decrypted).toBe(testData);
  });

  test("throws error for short password", () => {
    expect(() => new CryptoWrapper("short")).toThrow(
      "Password must be at least 12 characters long"
    );
  });

  test("throws error for too long password", () => {
    const tooLongPassword = "A".repeat(129) + "a1!"; // 132 chars with required complexity
    expect(() => new CryptoWrapper(tooLongPassword)).toThrow(
      "Password must not exceed 128 characters"
    );
  });

  test("throws error for empty password", () => {
    expect(() => new CryptoWrapper("")).toThrow("Password must be at least 12 characters long");
  });

  test("handles non-Error objects during key generation", () => {
    mockScryptSync.mockImplementation(() => {
      throw "Not an error object";
    });

    expect(() => new CryptoWrapper(validPassword)).toThrow("Failed to generate encryption key");
  });

  test("destroy clears sensitive data", () => {
    const testData = "test-data";
    const encrypted = wrapper.encrypt(testData);

    wrapper.destroy();

    // Key should be undefined after destroy
    expect(wrapper["key"]).toBeUndefined();
    // Salt should be empty after destroy
    expect(wrapper["salt"]).toBe("");

    // Attempting to use the wrapper after destroy should throw
    expect(() => wrapper.encrypt(testData)).toThrow();
    expect(() => wrapper.decrypt(encrypted)).toThrow();
  });

  test("uses existing salt when provided", () => {
    const existingSalt = "0123456789abcdef0123456789abcdef";
    const wrapper = new CryptoWrapper(validPassword, existingSalt);
    expect(wrapper.getSalt()).toBe(existingSalt);
  });

  test("throws error for invalid salt length", () => {
    const invalidSalt = "tooshort";
    expect(() => new CryptoWrapper(validPassword, invalidSalt)).toThrow("Invalid salt length");
  });

  test("throws error for invalid IV length in decrypt", () => {
    const invalidIV = "tooShort";
    const encrypted = `${invalidIV}:encrypted:tag`;
    expect(() => wrapper.decrypt(encrypted)).toThrow("Invalid IV length");
  });

  test("throws error for invalid auth tag length in decrypt", () => {
    const iv = "0123456789abcdef0123456789abcdef"; // 32 chars = 16 bytes in hex
    const invalidTag = "tooShort";
    const encrypted = `${iv}:encrypted:${invalidTag}`;
    expect(() => wrapper.decrypt(encrypted)).toThrow("Invalid auth tag length");
  });
});
