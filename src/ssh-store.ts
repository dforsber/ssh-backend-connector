import { encrypt, decrypt } from "./crypto";
import { SSHKeyPair, Backend } from "./types";
const Store = require("electron-store");

export class SSHStoreManager {
  private store: typeof Store;

  constructor() {
    this.store = new Store({
      encryptionKey: "your-secret-key",
      name: "ssh-config",
      defaults: {
        keypairs: {},
        backends: {},
      },
    });
  }

  saveKeyPair(keyPair: SSHKeyPair): void {
    const encrypted = {
      ...keyPair,
      privateKey: encrypt(keyPair.privateKey),
      publicKey: encrypt(keyPair.publicKey),
    };
    this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }

  getKeyPair(id: string): SSHKeyPair | null {
    const encrypted = this.store.get(`keypairs.${id}`) as SSHKeyPair | undefined;
    if (!encrypted) return null;
    return {
      id,
      name: encrypted.name,
      privateKey: decrypt(encrypted.privateKey),
      publicKey: decrypt(encrypted.publicKey),
    };
  }

  saveBackend(backend: Backend): void {
    this.store.set(`backends.${backend.id}`, backend);
  }

  getBackend(id: string): Backend | null {
    return this.store.get(`backends.${id}`, null);
  }

  getAllBackends(): Backend[] {
    const backends = this.store.get("backends");
    return Object.values(backends || {});
  }
}
