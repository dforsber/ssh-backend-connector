import { SSHStoreManager } from "../src/ssh-store";
import { JSONStore } from "../src/json-store";
import { type SSHKeyPair, type Backend } from "../src/types";
import { CryptoWrapper } from "../src/crypto-wrapper";

jest.mock("../src/json-store");

describe("SSHStoreManager", () => {
  let manager: SSHStoreManager;
  let mockStore: jest.Mocked<JSONStore>;
  const TEST_PASSWORD = "test-password-longer-than-32-chars-123456";
  const TEST_SALT = "0123456789abcdef0123456789abcdef";

  const mockKeyPair: SSHKeyPair = {
    id: "key1",
    privateKey: "private-key-content",
    publicKey: "public-key-content",
  };

  const mockBackend: Backend = {
    id: "backend1",
    name: "Test Backend",
    host: "192.168.1.100",
    port: 22,
    username: "admin",
    keyPairId: "key1",
  };

  beforeEach(async () => {
    mockStore = {
      init: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      keys: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<JSONStore>;

    (JSONStore as jest.MockedClass<typeof JSONStore>).mockImplementation(() => mockStore);

    manager = new SSHStoreManager();
  });

  describe("connect", () => {
    test("initializes store and creates new salt if none exists", async () => {
      mockStore.get.mockResolvedValue(null);
      await manager.connect(TEST_PASSWORD);

      expect(mockStore.init).toHaveBeenCalled();
      expect(mockStore.get).toHaveBeenCalledWith("crypto.salt");
      expect(mockStore.set).toHaveBeenCalledWith("crypto.salt", expect.any(String));
    });

    test("uses existing salt if available", async () => {
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        return null;
      });

      await manager.connect(TEST_PASSWORD);

      expect(mockStore.init).toHaveBeenCalled();
      expect(mockStore.get).toHaveBeenCalledWith("crypto.salt");
      expect(mockStore.set).not.toHaveBeenCalledWith("crypto.salt", expect.any(String));
    });

    test("throws error if called without password", async () => {
      await expect(manager.connect("")).rejects.toThrow("Password is required");
      await expect(manager.connect(undefined as unknown as string)).rejects.toThrow(
        "Password is required"
      );
    });

    test("throws and cleans up if store init fails", async () => {
      mockStore.init.mockRejectedValue(new Error("Init failed"));
      await expect(manager.connect(TEST_PASSWORD)).rejects.toThrow("Init failed");

      // Verify crypto is cleaned up
      expect(await manager.getKeyPair("any-id").catch((e) => e.message)).toBe(
        "Connect ssh store manager first"
      );
    });

    test("throws and cleans up if crypto verification fails", async () => {
      // Mock crypto verification to fail
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return "0".repeat(32); // Use invalid salt to trigger verification failure
        return null;
      });

      await expect(manager.connect(TEST_PASSWORD)).rejects.toThrow("Crypto verification failed");

      // Verify crypto is cleaned up
      expect(await manager.getKeyPair("any-id").catch((e) => e.message)).toBe(
        "Connect ssh store manager first"
      );
    });

    test("cleans up on general error", async () => {
      // Mock get to return all zeros salt which triggers verification failure
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return "0".repeat(32);
        return null;
      });

      await expect(manager.connect(TEST_PASSWORD)).rejects.toThrow("Crypto verification failed");
    });

    test("throws when crypto verification data mismatch", async () => {
      // Mock get to return valid salt
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        return null;
      });

      // Create a new instance after setting up the mock
      const testManager = new SSHStoreManager();

      // Mock the crypto verification to fail by returning wrong data
      jest.spyOn(CryptoWrapper.prototype, "decrypt").mockImplementation(() => "wrong-data");

      await expect(testManager.connect(TEST_PASSWORD)).rejects.toThrow(
        "Crypto verification failed"
      );

      // Verify crypto is cleaned up
      await expect(testManager.getKeyPair("any-id")).rejects.toThrow(
        "Connect ssh store manager first"
      );

      // Restore the original implementation
      jest.restoreAllMocks();
    });

    test("disconnect cleans up crypto and prevents further operations", async () => {
      // Setup
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        return null;
      });
      await manager.connect(TEST_PASSWORD);

      // Spy on crypto.destroy
      const destroySpy = jest.spyOn(CryptoWrapper.prototype, "destroy");

      // Act
      manager.disconnect();

      // Assert
      expect(destroySpy).toHaveBeenCalled();
      await expect(manager.getKeyPair("any-id")).rejects.toThrow("Connect ssh store manager first");

      // Cleanup
      destroySpy.mockRestore();
    });
  });

  describe("keyPair operations", () => {
    beforeEach(async () => {
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        return null;
      });
      await manager.connect(TEST_PASSWORD);
    });

    test("saveKeyPair encrypts and stores key pair", async () => {
      await manager.saveKeyPair(mockKeyPair);

      expect(mockStore.set).toHaveBeenCalledWith(
        `keypairs.${mockKeyPair.id}`,
        expect.objectContaining({
          id: mockKeyPair.id,
          privateKey: expect.any(String),
          publicKey: expect.any(String),
        })
      );
    });

    test("getKeyPair retrieves and decrypts key pair", async () => {
      // First save the key pair
      await manager.saveKeyPair(mockKeyPair);

      // Capture the encrypted data
      const encryptedData = (mockStore.set as jest.Mock).mock.calls[0][1];

      // Setup mock to return the encrypted data
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        if (key === `keypairs.${mockKeyPair.id}`) return encryptedData;
        return null;
      });

      const result = await manager.getKeyPair(mockKeyPair.id);
      expect(result).toEqual(mockKeyPair);
    });

    test("getKeyPair returns null for non-existent key", async () => {
      const result = await manager.getKeyPair("nonexistent");
      expect(result).toBeNull();
    });

    test("throws error when trying to save key pair without connecting first", async () => {
      manager = new SSHStoreManager();
      await expect(manager.saveKeyPair(mockKeyPair)).rejects.toThrow(
        "Connect ssh store manager first"
      );
    });

    test("throws error when trying to get key pair without connecting first", async () => {
      manager = new SSHStoreManager();
      await expect(manager.getKeyPair(mockKeyPair.id)).rejects.toThrow(
        "Connect ssh store manager first"
      );
    });

    test("getAllKeyPairs returns all key pairs", async () => {
      const otherKeyPair = { ...mockKeyPair, id: "key2" };

      await manager.saveKeyPair(mockKeyPair);
      await manager.saveKeyPair(otherKeyPair);

      mockStore.keys.mockResolvedValue([
        `keypairs.${mockKeyPair.id}`,
        `keypairs.${otherKeyPair.id}`,
      ]);

      // Store the encrypted data from the saveKeyPair calls
      const encryptedPairs = (mockStore.set as jest.Mock).mock.calls
        .filter((call) => call[0].startsWith("keypairs."))
        .map((call) => call[1]);

      // Update mock to return encrypted data
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        if (key === `keypairs.${mockKeyPair.id}`) return encryptedPairs[0];
        if (key === `keypairs.${otherKeyPair.id}`) return encryptedPairs[1];
        return null;
      });

      const results = await manager.getAllKeyPairs();
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(mockKeyPair);
      expect(results).toContainEqual(otherKeyPair);
    });

    test("deleteKeyPair removes key pair", async () => {
      await manager.deleteKeyPair(mockKeyPair.id);
      expect(mockStore.delete).toHaveBeenCalledWith(`keypairs.${mockKeyPair.id}`);
    });
  });

  describe("backend operations", () => {
    beforeEach(async () => {
      mockStore.get.mockImplementation(async (key) => {
        if (key === "crypto.salt") return TEST_SALT;
        return null;
      });
      await manager.connect(TEST_PASSWORD);
    });

    test("saveBackend stores backend configuration", async () => {
      await manager.saveBackend(mockBackend);
      expect(mockStore.set).toHaveBeenCalledWith(`backends.${mockBackend.id}`, mockBackend);
    });

    test("getBackend retrieves backend configuration", async () => {
      mockStore.get.mockResolvedValue(mockBackend);
      const result = await manager.getBackend(mockBackend.id);
      expect(result).toEqual(mockBackend);
    });

    test("getBackend returns null when backend not found", async () => {
      mockStore.get.mockResolvedValue(null);
      const result = await manager.getBackend("nonexistent");
      expect(result).toBeNull();
    });

    test("getAllBackends retrieves all backend configs", async () => {
      const otherBackend: Backend = {
        id: "other",
        name: "Other Backend",
        host: "192.168.1.101",
        port: 22,
        username: "admin2",
        keyPairId: "key2",
      };

      mockStore.keys.mockResolvedValue([
        `backends.${mockBackend.id}`,
        `backends.${otherBackend.id}`,
      ]);
      mockStore.get.mockResolvedValueOnce(mockBackend).mockResolvedValueOnce(otherBackend);

      const results = await manager.getAllBackends();
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(mockBackend);
      expect(results).toContainEqual(otherBackend);
    });

    test("deleteBackend removes backend", async () => {
      await manager.deleteBackend(mockBackend.id);
      expect(mockStore.delete).toHaveBeenCalledWith(`backends.${mockBackend.id}`);
    });

    test("getAllBackends handles missing backends gracefully", async () => {
      mockStore.keys.mockResolvedValue([`backends.${mockBackend.id}`]);
      mockStore.get.mockResolvedValue(null);

      const results = await manager.getAllBackends();
      expect(results).toHaveLength(0);
    });

    test("getAllBackends filters out undefined backends", async () => {
      const otherBackend = { ...mockBackend, id: "other" };
      mockStore.keys.mockResolvedValue([
        `backends.${mockBackend.id}`,
        `backends.${otherBackend.id}`,
        `backends.undefined-backend`,
      ]);

      // Return undefined for one backend to test filtering
      mockStore.get.mockImplementation(async (key) => {
        if (key === `backends.${mockBackend.id}`) return mockBackend;
        if (key === `backends.${otherBackend.id}`) return otherBackend;
        if (key === "backends.undefined-backend") return undefined;
        return null;
      });

      const results = await manager.getAllBackends();
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(mockBackend);
      expect(results).toContainEqual(otherBackend);
    });
  });
});
