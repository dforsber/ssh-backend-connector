import { Client } from "ssh2";
import { SSHStoreManager } from "./ssh-store";
import { SSHManagerConfig } from "./types";
export declare class SSHManager {
    private store;
    private readonly maxConnectionAttempts;
    private readonly attemptResetTimeMs;
    private readonly connectionTimeout;
    private readonly maxConcurrentConnections;
    private connectionAttempts;
    private connections;
    private listeningServers;
    constructor(store: SSHStoreManager, config?: SSHManagerConfig);
    private checkRateLimit;
    connect(backendId: string): Promise<Client>;
    private setupTunnels;
    private closeTunnels;
    disconnectAll(): void;
    disconnect(backendId: string): void;
}
//# sourceMappingURL=ssh-manager.d.ts.map