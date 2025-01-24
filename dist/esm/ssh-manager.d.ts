import { Client, ClientChannel } from "ssh2";
import { SSHStoreManager } from "./ssh-store";
export interface TunnelConfig {
    remotePort: number;
    localPort: number;
    remoteHost?: string;
}
export declare class SSHManager {
    private store;
    private connections;
    constructor(store: SSHStoreManager);
    connect(backendId: string): Promise<Client>;
    setupTunnel(backendId: string, config: TunnelConfig): Promise<ClientChannel>;
    disconnect(backendId: string): void;
}
//# sourceMappingURL=ssh-manager.d.ts.map