export interface StoreSchema {
    keypairs: Record<string, SSHKeyPair>;
    backends: Record<string, Backend>;
}
export interface SSHKeyPair {
    id: string;
    privateKey: string;
    name?: string;
}
export interface Backend {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    keyPairId: string;
    tunnels?: TunnelConfig[];
    data?: string;
}
export interface TunnelConfig {
    localPort: number;
    remotePort: number;
}
export interface SSHManagerConfig {
    connectionTimeout?: number;
    maxConcurrentConnections?: number;
    maxConnectionAttempts?: number;
    attemptResetTimeMs?: number;
}
//# sourceMappingURL=types.d.ts.map