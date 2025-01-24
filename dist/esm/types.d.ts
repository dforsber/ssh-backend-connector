export interface StoreSchema {
    keypairs: Record<string, SSHKeyPair>;
    backends: Record<string, Backend>;
}
export interface SSHKeyPair {
    id: string;
    privateKey: string;
    publicKey: string;
    name?: string;
}
export interface Backend {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    keyPairId: string;
}
//# sourceMappingURL=types.d.ts.map