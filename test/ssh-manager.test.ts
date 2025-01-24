// ssh-manager.test.ts
import { SSHManager } from "../src/ssh-manager";
import { SSHStoreManager } from "../src/ssh-store";
import { Client } from "ssh2";
import { Backend, SSHKeyPair } from "../src/types";

const pw = "dummyPwLongerAndLongerAndLonger123";

jest.mock("ssh2");
jest.mock("../src/ssh-store");

describe("SSHManager", () => {
  let manager: SSHManager;
  let mockStoreManager: jest.Mocked<SSHStoreManager>;
  let mockClient: jest.Mocked<Client>;

  const mockBackend: Backend = {
    id: "backend1",
    name: "Test Backend",
    host: "192.168.1.100",
    port: 22,
    username: "admin",
    keyPairId: "key1",
  };

  const mockKeyPair: SSHKeyPair = {
    id: "key1",
    name: "Test Key",
    privateKey: "private-key-content",
    publicKey: "public-key-content",
  };

  beforeEach(() => {
    mockClient = new Client() as jest.Mocked<Client>;
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);

    mockStoreManager = {
      init: jest.fn(),
      getBackend: jest.fn(),
      getKeyPair: jest.fn(),
      saveBackend: jest.fn(),
      saveKeyPair: jest.fn(),
      getAllBackends: jest.fn(),
    } as unknown as jest.Mocked<SSHStoreManager>;

    mockClient.on.mockImplementation(function (this: any, event: unknown, cb: unknown) {
      if (event === "ready" && typeof cb === "function") {
        setTimeout(() => cb(), 0);
      }
      return this;
    });

    manager = new SSHManager(pw, mockStoreManager);
  });

  describe("connect", () => {
    test("creates SSH connection successfully", async () => {
      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      const conn = await manager.connect(mockBackend.id);

      expect(conn).toBe(mockClient);
      expect(mockClient.connect).toHaveBeenCalledWith({
        host: mockBackend.host,
        port: mockBackend.port,
        username: mockBackend.username,
        privateKey: mockKeyPair.privateKey,
      });
    });

    test("throws when backend not found", async () => {
      mockStoreManager.getBackend.mockResolvedValue(null);
      await expect(manager.connect("nonexistent")).rejects.toThrow("Backend not found");
    });

    test("throws when key pair not found", async () => {
      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(null);
      await expect(manager.connect(mockBackend.id)).rejects.toThrow("SSH key pair not found");
    });

    test("handles connection error", async () => {
      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      const error = new Error("Connection failed");
      mockClient.on.mockImplementation(function (this: any, event: unknown, cb: unknown) {
        if (event === "error" && typeof cb === "function") {
          setTimeout(() => cb(error), 0);
        }
        return this;
      });

      await expect(manager.connect(mockBackend.id)).rejects.toThrow("Connection failed");
    });
  });

  describe("setupTunnel", () => {
    const tunnelConfig = {
      remotePort: 3000,
      localPort: 8080,
    };

    test("creates tunnel successfully", async () => {
      const mockChannel = {} as any;
      manager["connections"].set(mockBackend.id, mockClient);

      mockClient.forwardIn.mockImplementation((_host, _port, callback) => {
        if (callback) callback(undefined, _port);
        return mockClient;
      });

      mockClient.forwardOut.mockImplementation(
        (_localHost, _localPort, _remoteHost, _remotePort, callback) => {
          if (callback) callback(undefined, mockChannel);
          return mockClient;
        }
      );

      const channel = await manager.setupTunnel(mockBackend.id, tunnelConfig);
      expect(channel).toBe(mockChannel);
    });

    test("throws when not connected", async () => {
      await expect(manager.setupTunnel("nonexistent", tunnelConfig)).rejects.toThrow(
        "Not connected"
      );
    });

    test("handles forwardIn error", async () => {
      manager["connections"].set(mockBackend.id, mockClient);
      mockClient.forwardIn.mockImplementation((_host, _port, callback) => {
        if (callback) callback(new Error("Forward failed"), _port);
        return mockClient;
      });

      await expect(manager.setupTunnel(mockBackend.id, tunnelConfig)).rejects.toThrow(
        "Forward failed"
      );
    });

    test("handles forwardOut error", async () => {
      const mockChannel = {} as any;
      manager["connections"].set(mockBackend.id, mockClient);
      mockClient.forwardIn.mockImplementation((_host, _port, callback) => {
        if (callback) callback(undefined, _port);
        return mockClient;
      });

      mockClient.forwardOut.mockImplementation(
        (_localHost, _localPort, _remoteHost, _remotePort, callback) => {
          if (callback) callback(new Error("Forward out failed"), mockChannel);
          return mockClient;
        }
      );

      await expect(manager.setupTunnel(mockBackend.id, tunnelConfig)).rejects.toThrow(
        "Forward out failed"
      );
    });
  });

  describe("disconnect", () => {
    test("closes connection and removes from map", () => {
      manager["connections"].set(mockBackend.id, mockClient);
      manager.disconnect(mockBackend.id);

      expect(mockClient.end).toHaveBeenCalled();
      expect(manager["connections"].has(mockBackend.id)).toBeFalsy();
    });

    test("handles nonexistent connection gracefully", () => {
      const mockEndFn = jest.fn();
      const localMockClient = { end: mockEndFn } as unknown as Client;
      manager.disconnect("nonexistent");
      expect(localMockClient.end).not.toHaveBeenCalled();
    });
  });
});
