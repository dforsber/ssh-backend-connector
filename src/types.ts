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
}

export interface TunnelConfig {
  remotePort: number;
  localPort: number;
}

export interface SSHManagerConfig {
  connectionTimeout?: number; // Connection timeout in milliseconds
  maxConcurrentConnections?: number; // Maximum number of concurrent connections
  tunnelConfigs?: TunnelConfig[];
}
