import { SSHKeyPair, Backend } from "./types";
import { CryptoWrapper } from "./crypto-wrapper";
import { JSONStore } from "./json-store";

export class SSHStoreManager {
  private store: JSONStore;
  private crypto?: CryptoWrapper;

  constructor(storePath = ".ssh-store/data.json") {
    this.store = new JSONStore(storePath);
  }

  public async connect(password: string): Promise<void> {
    if (!password) throw new Error("Password is required");

    try {
      await this.store.init();
      const salt = await this.store.get<string>("crypto.salt");
      this.crypto = new CryptoWrapper(password, salt);
      if (!salt) await this.store.set("crypto.salt", this.crypto.getSalt());

      // Test crypto is working by trying to encrypt/decrypt test data
      const testData = "test";
      const encrypted = this.crypto.encrypt(testData);
      const decrypted = this.crypto.decrypt(encrypted);
      if (decrypted !== testData) {
        throw new Error("Crypto verification failed");
      }
    } catch (error) {
      // Clean up on error
      if (this.crypto) {
        this.crypto.destroy();
        this.crypto = undefined;
      }
      throw error;
    }
  }

  public disconnect(): void {
    if (this.crypto) {
      this.crypto.destroy();
      this.crypto = undefined;
    }
  }

  async saveKeyPair(keyPair: SSHKeyPair): Promise<void> {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
    const encrypted = {
      ...keyPair,
      privateKey: this.crypto.encrypt(keyPair.privateKey),
      publicKey: this.crypto.encrypt(keyPair.publicKey),
    };
    await this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }

  async getKeyPair(id: string): Promise<SSHKeyPair | null> {
    if (!this.crypto) throw new Error("Connect ssh store manager first");
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

  async deleteBackend(id: string): Promise<void> {
    await this.store.delete(`backends.${id}`);
  }

  async deleteKeyPair(id: string): Promise<void> {
    await this.store.delete(`keypairs.${id}`);
  }

  async getAllKeyPairs(): Promise<SSHKeyPair[]> {
    const keys = await this.store.keys();
    const keyPairKeys = keys.filter((k) => k.startsWith("keypairs."));
    const keyPairs = await Promise.all(
      keyPairKeys.map((k) => this.getKeyPair(k.replace("keypairs.", "")))
    );
    return keyPairs.filter((k): k is SSHKeyPair => k !== null);
  }
}
