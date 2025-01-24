import { Client, ClientChannel } from "ssh2";
import { SSHStoreManager } from "./ssh-store";

export interface TunnelConfig {
  remotePort: number;
  localPort: number;
  remoteHost?: string;
}

export class SSHManager {
  private store: SSHStoreManager;
  private connections: Map<string, Client>;
  private readonly maxConnectionAttempts = 3;
  private readonly attemptResetTimeMs = 300000; // 5 minutes
  private connectionAttempts: Map<string, { count: number; lastAttempt: number }>;

  constructor(store: SSHStoreManager) {
    this.store = store;
    this.connections = new Map();
    this.connectionAttempts = new Map();
  }

  private checkRateLimit(backendId: string): void {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(backendId);

    if (attempts) {
      // Reset if enough time has passed
      if (now - attempts.lastAttempt > this.attemptResetTimeMs) {
        this.connectionAttempts.set(backendId, { count: 1, lastAttempt: now });
        return;
      }

      if (attempts.count >= this.maxConnectionAttempts) {
        throw new Error("Too many connection attempts. Please try again later.");
      }

      this.connectionAttempts.set(backendId, {
        count: attempts.count + 1,
        lastAttempt: now,
      });
    } else {
      this.connectionAttempts.set(backendId, { count: 1, lastAttempt: now });
    }
  }

  async connect(backendId: string): Promise<Client> {
    this.checkRateLimit(backendId);
    const backend = await this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");

    const keyPair = await this.store.getKeyPair(backend.keyPairId);
    if (!keyPair) throw new Error("SSH key pair not found");

    const conn = new Client();

    return new Promise((resolve, reject) => {
      conn
        .on("ready", () => {
          this.connections.set(backendId, conn);
          resolve(conn);
        })
        .on("error", (err) => {
          reject(err);
        })
        .connect({
          host: backend.host,
          port: backend.port,
          username: backend.username,
          privateKey: keyPair.privateKey,
        });
    });
  }

  async setupTunnel(backendId: string, config: TunnelConfig): Promise<ClientChannel> {
    const conn = this.connections.get(backendId);
    if (!conn) throw new Error("Not connected");

    const { remotePort, localPort, remoteHost = "127.0.0.1" } = config;

    return new Promise((resolve, reject) => {
      try {
        conn.forwardIn(remoteHost, remotePort, (err) => {
          if (err) {
            reject(err);
          } else {
            conn.forwardOut("127.0.0.1", localPort, remoteHost, remotePort, (err, channel) => {
              if (err) reject(err);
              else resolve(channel);
            });
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(backendId: string): void {
    const conn = this.connections.get(backendId);
    if (conn) {
      conn.end();
      this.connections.delete(backendId);
    }
  }
}
