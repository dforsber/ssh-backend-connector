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

    manager = new SSHManager(mockStoreManager);
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

    test("handles connection timeout", async () => {
      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Mock a connection that never calls 'ready'
      mockClient.on.mockImplementation(function (this: any) {
        return this;
      });

      // Create manager with short timeout
      const managerWithTimeout = new SSHManager(mockStoreManager, {
        connectionTimeout: 100, // 100ms timeout
      });

      await expect(managerWithTimeout.connect(mockBackend.id)).rejects.toThrow(
        "Connection timeout after 100ms"
      );

      // Verify connection is cleaned up
      expect(mockClient.end).toHaveBeenCalled();
      expect(managerWithTimeout["connections"].size).toBe(0);
    });

    test("throws when max concurrent connections reached", async () => {
      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Create manager with max 1 connection
      const managerWithLimit = new SSHManager(mockStoreManager, {
        maxConcurrentConnections: 1,
      });

      // First connection should succeed
      await managerWithLimit.connect(mockBackend.id);

      // Second connection should fail
      await expect(managerWithLimit.connect("another-backend")).rejects.toThrow(
        "Maximum concurrent connections (1) reached"
      );
    });

    test("resets attempt count after reset time", async () => {
      const backendId = "test-backend";
      const oldTime = Date.now() - 400000; // Older than attemptResetTimeMs (300000)

      // Set up initial attempts
      manager["connectionAttempts"].set(backendId, {
        count: 3,
        lastAttempt: oldTime,
      });

      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Should not throw as attempts should reset
      await manager.connect(backendId);

      // Verify attempts were reset
      const newAttempts = manager["connectionAttempts"].get(backendId);
      expect(newAttempts?.count).toBe(1);
      expect(newAttempts?.lastAttempt).toBeGreaterThan(oldTime);
    });

    test("throws error when max attempts exceeded within reset time", async () => {
      const backendId = "test-backend";
      const recentTime = Date.now() - 1000; // Recent attempt

      // Set up max attempts
      manager["connectionAttempts"].set(backendId, {
        count: manager["maxConnectionAttempts"],
        lastAttempt: recentTime,
      });

      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Should throw due to too many attempts
      await expect(manager.connect(backendId)).rejects.toThrow(
        "Too many connection attempts. Please try again later."
      );
    });

    test("increments attempt count within reset time", async () => {
      const backendId = "test-backend";
      const recentTime = Date.now() - 1000; // Recent attempt

      // Set up initial attempts
      manager["connectionAttempts"].set(backendId, {
        count: 1,
        lastAttempt: recentTime,
      });

      mockStoreManager.getBackend.mockResolvedValue(mockBackend);
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      await manager.connect(backendId);

      // Verify attempt count was incremented
      const attempts = manager["connectionAttempts"].get(backendId);
      expect(attempts?.count).toBe(2);
      expect(attempts?.lastAttempt).toBeGreaterThan(recentTime);
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

    test("handles general tunnel setup error", async () => {
      manager["connections"].set(mockBackend.id, mockClient);
      mockClient.forwardIn.mockImplementation(() => {
        throw new Error("General tunnel error");
      });

      await expect(manager.setupTunnel(mockBackend.id, tunnelConfig)).rejects.toThrow(
        "General tunnel error"
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
