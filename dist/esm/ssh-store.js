import { encrypt, decrypt } from "./crypto.js";
const Store = require("electron-store");
export class SSHStoreManager {
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
    saveKeyPair(keyPair) {
        const encrypted = {
            ...keyPair,
            privateKey: encrypt(keyPair.privateKey),
            publicKey: encrypt(keyPair.publicKey),
        };
        this.store.set(`keypairs.${keyPair.id}`, encrypted);
    }
    getKeyPair(id) {
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
        this.store.set(`backends.${backend.id}`, backend);
    }
    getBackend(id) {
        return this.store.get(`backends.${id}`, null);
    }
    getAllBackends() {
        const backends = this.store.get("backends");
        return Object.values(backends || {});
    }
}
