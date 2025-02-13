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
  data?: string; // piggy backed arbitrary data
}

export interface TunnelConfig {
  localPort: number;
  remotePort: number;
}

export interface SSHManagerConfig {
  connectionTimeout?: number; // Connection timeout in milliseconds
  maxConcurrentConnections?: number; // Maximum number of concurrent connections
  maxConnectionAttempts?: number; // for rate limiting: max connection attempts per attemptResetTimeMs
  attemptResetTimeMs?: number; // for rate limiting: time range for calculating connection attempts
}
