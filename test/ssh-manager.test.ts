import { Client, ClientChannel } from "ssh2";
import { SSHManager } from "../src/ssh-manager";
import { SSHStoreManager } from "../src/ssh-store";
import { jest } from "@jest/globals";

jest.mock("ssh2");

describe("SSHManager", () => {
  let manager: SSHManager;
  let mockStoreManager: jest.Mocked<SSHStoreManager>;
  let mockClient: jest.Mocked<Client>;

  const mockBackend = {
    id: "backend1",
    name: "Test Backend",
    host: "192.168.1.100",
    port: 22,
    username: "admin",
    keyPairId: "key1",
  };

  const mockKeyPair = {
    id: "key1",
    name: "Test Key",
    privateKey: "private-key-content",
    publicKey: "public-key-content",
  };

  beforeEach(() => {
    mockClient = new Client() as jest.Mocked<Client>;
    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);

    mockStoreManager = {
      getBackend: jest.fn(),
      getKeyPair: jest.fn(),
      saveBackend: jest.fn(),
      saveKeyPair: jest.fn(),
      getAllBackends: jest.fn(),
    } as unknown as jest.Mocked<SSHStoreManager>;

    manager = new SSHManager(mockStoreManager);
  });

  describe("connect", () => {
    it("creates SSH connection successfully", async () => {
      mockStoreManager.getBackend.mockReturnValue(mockBackend);
      mockStoreManager.getKeyPair.mockReturnValue(mockKeyPair);

      mockClient.on.mockImplementation(function (this: any, event: unknown, cb: unknown) {
        if (event === "ready" && typeof cb === "function") {
          setTimeout(() => cb(), 0);
        }
        return this;
      });

      const conn = await manager.connect(mockBackend.id);

      expect(conn).toBe(mockClient);
      expect(mockClient.connect).toHaveBeenCalledWith({
        host: mockBackend.host,
        port: mockBackend.port,
        username: mockBackend.username,
        privateKey: mockKeyPair.privateKey,
      });
    });

    it("throws when backend not found", async () => {
      mockStoreManager.getBackend.mockReturnValue(null);
      await expect(manager.connect("nonexistent")).rejects.toThrow("Backend not found");
    });

    it("throws when key pair not found", async () => {
      mockStoreManager.getBackend.mockReturnValue(mockBackend);
      mockStoreManager.getKeyPair.mockReturnValue(null);
      await expect(manager.connect(mockBackend.id)).rejects.toThrow("SSH key pair not found");
    });

    it("handles connection error", async () => {
      mockStoreManager.getBackend.mockReturnValue(mockBackend);
      mockStoreManager.getKeyPair.mockReturnValue(mockKeyPair);

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
    beforeEach(() => {
      mockClient = new Client() as jest.Mocked<Client>;
      // Reset all mock implementations
      mockClient.forwardIn.mockReset();
      mockClient.forwardOut.mockReset();
      mockClient.end.mockReset();
    });

    const tunnelConfig = {
      remotePort: 3000,
      localPort: 8080,
    };

    it("creates tunnel successfully", async () => {
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
      expect(mockClient.forwardIn).toHaveBeenCalledWith(
        "127.0.0.1",
        tunnelConfig.remotePort,
        expect.any(Function)
      );
      expect(mockClient.forwardOut).toHaveBeenCalledWith(
        "127.0.0.1",
        tunnelConfig.localPort,
        "127.0.0.1",
        tunnelConfig.remotePort,
        expect.any(Function)
      );
    });

    it("throws when not connected", async () => {
      await expect(manager.setupTunnel("nonexistent", tunnelConfig)).rejects.toThrow(
        "Not connected"
      );
    });

    it("handles forwardIn error with specific message", async () => {
      manager["connections"].set(mockBackend.id, mockClient);
      const errorMessage = "Port already in use";
      mockClient.forwardIn.mockImplementation((_host, _port, callback) => {
        console.log(callback);
        if (callback) callback(new Error(errorMessage), _port);
        return mockClient;
      });

      await expect(manager.setupTunnel(mockBackend.id, tunnelConfig)).rejects.toThrow(errorMessage);
      expect(mockClient.forwardOut).not.toHaveBeenCalled();
    });

    it("handles forwardOut error with specific message", async () => {
      manager["connections"].set(mockBackend.id, mockClient);
      mockClient.forwardIn.mockImplementation((_host, _port, callback) => {
        if (callback) callback(undefined, _port);
        return mockClient;
      });

      mockClient.forwardOut.mockImplementation(
        (_localHost, _localPort, _remoteHost, _remotePort, callback) => {
          if (callback) callback(new Error("Forward out failed"), <ClientChannel>{});
          return mockClient;
        }
      );

      await expect(manager.setupTunnel(mockBackend.id, tunnelConfig)).rejects.toThrow(
        "Forward out failed"
      );
      expect(mockClient.forwardIn).toHaveBeenCalled();
      expect(mockClient.forwardOut).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    beforeEach(() => {
      mockClient = new Client() as jest.Mocked<Client>;
      // Reset all mock implementations
      mockClient.forwardIn.mockReset();
      mockClient.forwardOut.mockReset();
    });

    it("closes connection and removes from map", () => {
      manager["connections"].set(mockBackend.id, mockClient);
      manager.disconnect(mockBackend.id);

      expect(mockClient.end).toHaveBeenCalled();
      expect(manager["connections"].has(mockBackend.id)).toBeFalsy();
    });

    it("handles nonexistent connection gracefully", () => {
      manager.disconnect("nonexistent");
      expect(mockClient.end).not.toHaveBeenCalled();
    });
  });
});
