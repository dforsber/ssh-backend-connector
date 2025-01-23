import { SSHManager } from "../src/ssh-manager";
import { Client } from "ssh2";
import { SSHStoreManager } from "../src/ssh-store";
import { jest } from "@jest/globals";

jest.mock("ssh2");

describe("SSHManager", () => {
  let manager: SSHManager;
  let mockStoreManager: jest.Mocked<SSHStoreManager>;
  let mockClient: jest.Mocked<Client>;

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

    mockClient.on.mockImplementation(function (this: any, event: unknown, cb: unknown) {
      if (event === "ready" && typeof cb === "function") {
        setTimeout(() => cb(), 0);
      }
      return this;
    });

    manager = new SSHManager(mockStoreManager);
  });

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

  test("connect creates SSH connection", async () => {
    mockStoreManager.getBackend.mockReturnValue(mockBackend);
    mockStoreManager.getKeyPair.mockReturnValue(mockKeyPair);

    await manager.connect(mockBackend.id);

    expect(mockClient.connect).toHaveBeenCalledWith({
      host: mockBackend.host,
      port: mockBackend.port,
      username: mockBackend.username,
      privateKey: mockKeyPair.privateKey,
    });
  });
});
