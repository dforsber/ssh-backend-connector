"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHStoreManager = void 0;
const crypto_js_1 = require("./crypto.js");
const Store = __importStar(require("electron-store"));
class SSHStoreManager {
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
            privateKey: (0, crypto_js_1.encrypt)(keyPair.privateKey),
            publicKey: (0, crypto_js_1.encrypt)(keyPair.publicKey),
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
            privateKey: (0, crypto_js_1.decrypt)(encrypted.privateKey),
            publicKey: (0, crypto_js_1.decrypt)(encrypted.publicKey),
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
exports.SSHStoreManager = SSHStoreManager;
