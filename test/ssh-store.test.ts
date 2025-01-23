import { encrypt } from "../src/crypto";
import { SSHStoreManager } from "../src/ssh-store";
import { jest } from "@jest/globals";

// Define mock methods type
interface StoreMock {
  get: jest.Mock;
  set: jest.Mock;
}

const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
} as StoreMock;

jest.mock("electron-store", () => {
  return jest.fn().mockImplementation(() => mockStore);
});

describe("SSHStoreManager", () => {
  let manager: SSHStoreManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new SSHStoreManager();
  });

  const mockKeyPair = {
    id: "key1",
    privateKey: "private-content",
    publicKey: "public-content",
  };

  const mockBackend = {
    id: "backend1",
    name: "Production Server",
    host: "192.168.1.100",
    port: 22,
    username: "admin",
    keyPairId: "key1",
  };

  test("saveKeyPair encrypts and stores key pair", () => {
    manager.saveKeyPair(mockKeyPair);
    expect(mockStore.set).toHaveBeenCalledWith(
      `keypairs.${mockKeyPair.id}`,
      expect.objectContaining({
        id: mockKeyPair.id,
        privateKey: expect.any(String),
        publicKey: expect.any(String),
      })
    );
  });

  test("getKeyPair retrieves and decrypts key pair", () => {
    const encryptedData = {
      id: "key1",
      privateKey: encrypt("private-key-content"),
      publicKey: encrypt("public-key-content"),
    };

    mockStore.get.mockReturnValue(encryptedData);

    const result = manager.getKeyPair("key1");
    expect(result).toEqual({
      id: "key1",
      privateKey: "private-key-content",
      publicKey: "public-key-content",
    });
  });

  test("saveBackend stores backend configuration", () => {
    manager.saveBackend(mockBackend);
    expect(mockStore.set).toHaveBeenCalledWith(`backends.${mockBackend.id}`, mockBackend);
  });

  test("getBackend retrieves backend configuration", () => {
    mockStore.get.mockReturnValue(mockBackend);
    const result = manager.getBackend(mockBackend.id);
    expect(result).toEqual(mockBackend);
  });

  test("getAllBackends returns array of backends", () => {
    mockStore.get.mockReturnValue({
      [mockBackend.id]: mockBackend,
    });
    const result = manager.getAllBackends();
    expect(result).toEqual([mockBackend]);
  });
});
