import { encrypt, decrypt } from "./crypto.js";
import * as Store from "electron-store";
export class SSHStoreManager {
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
    saveKeyPair(keyPair) {
        const encrypted = {
            ...keyPair,
            privateKey: encrypt(keyPair.privateKey),
            publicKey: encrypt(keyPair.publicKey),
        };
        // @ts-expect-error
        this.store.set(`keypairs.${keyPair.id}`, encrypted);
    }
    getKeyPair(id) {
        // @ts-expect-error
        const encrypted = this.store.get(`keypairs.${id}`);
        if (!encrypted)
            return null;
        return {
            id,
            name: encrypted.name,
            privateKey: decrypt(encrypted.privateKey),
            publicKey: decrypt(encrypted.publicKey),
        };
    }
    saveBackend(backend) {
        // @ts-expect-error
        this.store.set(`backends.${backend.id}`, backend);
    }
    getBackend(id) {
        // @ts-expect-error
        return this.store.get(`backends.${id}`, null);
    }
    getAllBackends() {
        // @ts-expect-error
        const backends = this.store.get("backends");
        return Object.values(backends || {});
    }
}
