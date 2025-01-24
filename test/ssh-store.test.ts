import { SSHStoreManager } from "../src/ssh-store";
import { JSONStore } from "../src/json-store";
import { type SSHKeyPair, type Backend } from "../src/types";
import { CryptoConfig, CryptoWrapper } from "../src/crypto-wrapper";

jest.mock("../src/json-store");

const cwConf: CryptoConfig = {
  secretKey: "dummy-key",
  salt: "dummy-salt",
};

describe("SSHStoreManager", () => {
  let manager: SSHStoreManager;
  let mockStore: jest.Mocked<JSONStore>;

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

    manager = new SSHStoreManager(cwConf);
    await manager.init();
  });

  describe("keyPair operations", () => {
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
      const cw = new CryptoWrapper(cwConf);
      const encryptedData = {
        id: mockKeyPair.id,
        privateKey: cw.encrypt(mockKeyPair.privateKey),
        publicKey: cw.encrypt(mockKeyPair.publicKey),
      };

      mockStore.get.mockResolvedValue(encryptedData);

      const result = await manager.getKeyPair(mockKeyPair.id);
      expect(result).toEqual(mockKeyPair);
    });

    test("getKeyPair returns null when key not found", async () => {
      mockStore.get.mockResolvedValue(null);
      const result = await manager.getKeyPair("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("backend operations", () => {
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

      mockStore.keys.mockResolvedValue([`backends.${mockBackend.id}`, "backends.other"]);

      mockStore.get.mockResolvedValueOnce(mockBackend).mockResolvedValueOnce(otherBackend);

      const results = await manager.getAllBackends();
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockBackend);
      expect(results[1]).toEqual(otherBackend);
    });
  });

  test("init initializes store", async () => {
    await manager.init();
    expect(mockStore.init).toHaveBeenCalled();
  });
});
