import { SSHKeyPair, Backend } from "./types.js";
export declare class SSHStoreManager {
    private store;
    constructor();
    saveKeyPair(keyPair: SSHKeyPair): void;
    getKeyPair(id: string): SSHKeyPair | null;
    saveBackend(backend: Backend): void;
    getBackend(id: string): Backend | null;
    getAllBackends(): Backend[];
}
