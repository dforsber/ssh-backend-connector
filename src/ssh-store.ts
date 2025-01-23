import { encrypt, decrypt } from "./crypto.js";
import { SSHKeyPair, Backend } from "./types.js";
import * as Store from "electron-store";

export class SSHStoreManager {
  private store: typeof Store;

  constructor() {
    // @ts-expect-error
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
    // @ts-expect-error
    this.store.set(`keypairs.${keyPair.id}`, encrypted);
  }

  getKeyPair(id: string): SSHKeyPair | null {
    // @ts-expect-error
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
    // @ts-expect-error
    this.store.set(`backends.${backend.id}`, backend);
  }

  getBackend(id: string): Backend | null {
    // @ts-expect-error
    return this.store.get(`backends.${id}`, null);
  }

  getAllBackends(): Backend[] {
    // @ts-expect-error
    const backends = this.store.get("backends");
    return Object.values(backends || {});
  }
}
