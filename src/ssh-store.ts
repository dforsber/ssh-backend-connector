import { SSHKeyPair, Backend } from "./types";
import { CryptoConfig, CryptoWrapper } from "./crypto-wrapper";
import { JSONStore } from "./json-store";

export class SSHStoreManager {
  private store: JSONStore;
  private crypto: CryptoWrapper;

  constructor(cryptoConfig: CryptoConfig, storePath = ".ssh-store/data.json") {
    this.store = new JSONStore(storePath);
    this.crypto = new CryptoWrapper(cryptoConfig);
  }

  public async init(): Promise<void> {
    await this.store.init();
  }

  async saveKeyPair(keyPair: SSHKeyPair): Promise<void> {
    const encrypted = {
      ...keyPair,
      privateKey: this.crypto.encrypt(keyPair.privateKey),
      publicKey: this.crypto.encrypt(keyPair.publicKey),
    };
    await this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }

  async getKeyPair(id: string): Promise<SSHKeyPair | null> {
    const encrypted = await this.store.get<SSHKeyPair>(`keypairs.${id}`);
    if (!encrypted) return null;
    return {
      id,
      privateKey: this.crypto.decrypt(encrypted.privateKey),
      publicKey: this.crypto.decrypt(encrypted.publicKey),
    };
  }

  // Update other methods to be async
  async saveBackend(backend: Backend): Promise<void> {
    await this.store.set(`backends.${backend.id}`, backend);
  }

  async getBackend(id: string): Promise<Backend | null> {
    return this.store.get(`backends.${id}`);
  }

  async getAllBackends(): Promise<Backend[]> {
    const keys = await this.store.keys();
    const backendKeys = keys.filter((k) => k.startsWith("backends."));
    const backends = await Promise.all(backendKeys.map((k) => this.store.get<Backend>(k)));
    return backends.filter((b): b is Backend => b !== null && b !== undefined);
  }
}
