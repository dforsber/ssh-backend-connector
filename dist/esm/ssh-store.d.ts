import { SSHKeyPair, Backend } from "./types";
export declare class SSHStoreManager {
    private store;
    private crypto?;
    constructor(storePath?: string);
    connect(password: string): Promise<void>;
    isConnected(): boolean;
    disconnect(): void;
    saveKeyPair(keyPair: SSHKeyPair): Promise<void>;
    getKeyPair(id: string): Promise<SSHKeyPair | null>;
    saveBackend(backend: Backend): Promise<void>;
    getBackend(id: string): Promise<Backend | null>;
    getAllBackends(): Promise<Backend[]>;
    deleteBackend(id: string): Promise<void>;
    deleteKeyPair(id: string): Promise<void>;
    getAllKeyPairs(): Promise<SSHKeyPair[]>;
}
//# sourceMappingURL=ssh-store.d.ts.map