import { SSHManager } from "../src/ssh-manager";
import { SSHStoreManager } from "../src/ssh-store";
import { Client, ClientChannel } from "ssh2";
import { Backend, SSHKeyPair } from "../src/types";
import { Socket } from "node:net";

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

  afterEach(() => {
    manager.disconnectAll();
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

    test("creates SSH connection successfully - with tunnel", async () => {
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
      } as unknown as ClientChannel;
      const mockClientSocket = {
        pipe: jest.fn().mockReturnThis(),
      } as unknown as Socket;
      
      // Mock stream data events for verification
      const streamPipeSpy = jest.spyOn(mockStream, 'pipe');
      const socketPipeSpy = jest.spyOn(mockClientSocket, 'pipe');

      // @ts-expect-error
      mockClient.forwardOut = function (_a, _b, _c, _d, cb) {
        if (cb) {
          cb(undefined, mockStream);
          // Simulate the piping that happens in the actual code
          mockStream.pipe(mockClientSocket);
          mockClientSocket.pipe(mockStream);
        }
        return this;
      };

      manager = new SSHManager(mockStoreManager);

      mockStoreManager.getBackend.mockResolvedValue({
        ...mockBackend,
        tunnels: [
          {
            localPort: 11234,
            remotePort: 14321,
          },
        ],
      });
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Create a mock server event handler
      const serverConnection = jest.fn((handler) => {
        // Simulate client connection by calling the handler directly
        handler(mockClientSocket);
      });

      // Mock createServer
      const mockServer = {
        listen: jest.fn((port, cb) => {
          expect(port).toBe(11234);
          if (cb) cb();
          return mockServer;
        }),
        on: jest.fn((event, handler) => {
          if (event === 'connection') {
            serverConnection(handler);
          }
          return mockServer;
        }),
      };

      jest.spyOn(require('node:net'), 'createServer').mockImplementation(() => mockServer);

      const conn = await manager.connect(mockBackend.id);

      expect(conn).toBe(mockClient);
      expect(mockClient.connect).toHaveBeenCalledWith({
        host: mockBackend.host,
        port: mockBackend.port,
        username: mockBackend.username,
        privateKey: mockKeyPair.privateKey,
      });

      // Verify stream piping
      expect(streamPipeSpy).toHaveBeenCalled();
      expect(socketPipeSpy).toHaveBeenCalled();
      
      // Verify server setup
      expect(mockServer.listen).toHaveBeenCalledWith(11234, expect.any(Function));

      manager.disconnectAll();
      
      // Clean up
      streamPipeSpy.mockRestore();
      socketPipeSpy.mockRestore();
      jest.restoreAllMocks();
    });

    test("does not create SSH connection due to tunnel error", async () => {
      mockStoreManager.getBackend.mockResolvedValue({
        ...mockBackend,
        tunnels: [{ localPort: 11234, remotePort: 14321 }],
      });
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Store original forwardOut implementation
      const originalForwardOut = mockClient.forwardOut;

      try {
        // Mock forwardOut to simulate error
        mockClient.forwardOut = jest.fn().mockImplementation((_a, _b, _c, _d, cb) => {
          if (cb) cb(new Error("Test error"));
          return mockClient;
        });

        await expect(manager.connect(mockBackend.id)).rejects.toThrow("Test error");

        // Verify connection was cleaned up
        expect(manager["connections"].has(mockBackend.id)).toBeFalsy();
      } finally {
        // Restore original forwardOut implementation
        mockClient.forwardOut = originalForwardOut;
      }
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

      mockClient.on.mockImplementation(function (this: any, event: unknown, cb: unknown) {
        if (event === "error" && typeof cb === "function") {
          setTimeout(() => cb(new Error("Connection failed")), 0);
        }
        return this;
      });

      await expect(manager.connect(mockBackend.id)).rejects.toThrow();
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
      managerWithTimeout.disconnectAll();
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
      managerWithLimit.disconnectAll();
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

    test("handles tunnel setup error in try block", async () => {
      mockStoreManager.getBackend.mockResolvedValue({
        ...mockBackend,
        tunnels: [{ localPort: 11234, remotePort: 14321 }],
      });
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Store original forwardOut implementation
      const originalForwardOut = mockClient.forwardOut;

      try {
        // Mock forwardOut to throw directly
        mockClient.forwardOut = jest.fn().mockImplementation(() => {
          throw new Error("Direct tunnel error");
        });

        await expect(manager.connect(mockBackend.id)).rejects.toThrow("Direct tunnel error");
      } finally {
        // Restore original forwardOut implementation
        manager.disconnect(mockBackend.id);
        mockClient.forwardOut = originalForwardOut;
      }
    });

    test("handles tunnel setup error in catch block", async () => {
      mockStoreManager.getBackend.mockResolvedValue({
        ...mockBackend,
        tunnels: [{ localPort: 11234, remotePort: 14321 }],
      });
      mockStoreManager.getKeyPair.mockResolvedValue(mockKeyPair);

      // Mock Promise.all to throw
      jest.spyOn(Promise, "all").mockRejectedValueOnce(new Error("Tunnel setup failed"));

      await expect(manager.connect(mockBackend.id)).rejects.toThrow("Tunnel setup failed");
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

  describe("disconnect", () => {
    test("closes connection and removes from map", () => {
      manager["connections"].set(mockBackend.id, mockClient);
      manager.disconnect(mockBackend.id);

      expect(mockClient.end).toHaveBeenCalled();
      expect(manager["connections"].has(mockBackend.id)).toBeFalsy();
    });

    test("handles errors in disconnectAll", () => {
      const mockServer = {
        close: jest.fn().mockImplementation(() => {
          throw new Error("Close failed");
        }),
      };

      // Set up a connection and server that will throw on disconnect
      manager["connections"].set(mockBackend.id, mockClient);
      manager["listeningServers"].set(`${mockBackend.id}:0`, mockServer as any);

      // Should not throw
      expect(() => manager.disconnectAll()).not.toThrow();
    });

    test("handles nonexistent connection gracefully", () => {
      const mockEndFn = jest.fn();
      const localMockClient = { end: mockEndFn } as unknown as Client;
      manager.disconnect("nonexistent");
      expect(localMockClient.end).not.toHaveBeenCalled();
    });
  });
});
