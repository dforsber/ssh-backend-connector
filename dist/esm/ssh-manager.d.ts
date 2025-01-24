import { Client, ClientChannel } from "ssh2";
import { SSHStoreManager } from "./ssh-store";
import { SSHManagerConfig } from "./types";
export interface TunnelConfig {
    remotePort: number;
    localPort: number;
    remoteHost?: string;
}
export declare class SSHManager {
    private store;
    private connections;
    private readonly maxConnectionAttempts;
    private readonly attemptResetTimeMs;
    private readonly connectionTimeout;
    private readonly maxConcurrentConnections;
    private connectionAttempts;
    constructor(store: SSHStoreManager, config?: SSHManagerConfig);
    private checkRateLimit;
    connect(backendId: string): Promise<Client>;
    setupTunnel(backendId: string, config: TunnelConfig): Promise<ClientChannel>;
    disconnect(backendId: string): void;
}
//# sourceMappingURL=ssh-manager.d.ts.map