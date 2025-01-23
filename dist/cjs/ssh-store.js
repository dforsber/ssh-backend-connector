"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHStoreManager = void 0;
const crypto_js_1 = require("./crypto.js");
const Store = require("electron-store");
class SSHStoreManager {
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
            privateKey: (0, crypto_js_1.encrypt)(keyPair.privateKey),
            publicKey: (0, crypto_js_1.encrypt)(keyPair.publicKey),
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
            privateKey: (0, crypto_js_1.decrypt)(encrypted.privateKey),
            publicKey: (0, crypto_js_1.decrypt)(encrypted.publicKey),
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
exports.SSHStoreManager = SSHStoreManager;
