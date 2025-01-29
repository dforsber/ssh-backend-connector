import { Client, ConnectConfig } from "ssh2";
import { SSHStoreManager } from "./ssh-store";
import { SSHManagerConfig, TunnelConfig } from "./types";
import { createServer, Server } from "node:net";

export class SSHManager {
  private store: SSHStoreManager;
  private readonly maxConnectionAttempts = 3;
  private readonly attemptResetTimeMs = 300000; // 5 minutes
  private readonly connectionTimeout: number;
  private readonly maxConcurrentConnections: number;
  private connectionAttempts: Map<string, { count: number; lastAttempt: number }>;
  private connections: Map<string, Client> = new Map();
  private listeningServers: Map<string, Server> = new Map();

  constructor(store: SSHStoreManager, config?: SSHManagerConfig) {
    this.store = store;
    this.connections = new Map();
    this.connectionAttempts = new Map();
    this.connectionTimeout = config?.connectionTimeout ?? 30000; // Default 30 seconds
    this.maxConcurrentConnections = config?.maxConcurrentConnections ?? 10; // Default 10 connections
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

    if (this.connections.size >= this.maxConcurrentConnections) {
      throw new Error(`Maximum concurrent connections (${this.maxConcurrentConnections}) reached`);
    }

    const backend = await this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");

    const keyPair = await this.store.getKeyPair(backend.keyPairId);
    if (!keyPair) throw new Error("SSH key pair not found");

    const conn = new Client();
    const connParams: ConnectConfig = {
      host: backend.host,
      port: backend.port,
      username: backend.username,
      privateKey: keyPair.privateKey,
      // debug: (m) => console.log(m),
    };

    return new Promise((resolve, reject) => {
      // Set connection timeout
      const timeoutId = setTimeout(() => {
        conn.end();
        reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
      }, this.connectionTimeout);
      conn
        .on("ready", async () => {
          clearTimeout(timeoutId);
          try {
            await this.setupTunnels(conn, backend.id, backend.host, backend.tunnels ?? []);
            this.connections.set(backendId, conn);
            resolve(conn);
          } catch (err) {
            conn.end();
            reject(err);
          }
        })
        .on("error", (err) => {
          conn.end();
          reject(err);
        })
        .connect(connParams);
    });
  }

  private async setupTunnels(
    conn: Client,
    backendId: string,
    backendHost: string,
    tunnelConfigs: TunnelConfig[]
  ): Promise<string[]> {
    try {
      return await Promise.all(
        tunnelConfigs.map(
          (config, ind) =>
            new Promise<string>((resolve, reject) => {
              try {
                conn.forwardOut(
                  "127.0.0.1",
                  config.localPort,
                  backendHost,
                  config.remotePort,
                  (err, stream) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    const serv = createServer((sock) => {
                      sock.pipe(stream).pipe(sock);
                    });
                    serv.listen(config.localPort, () => {
                      const connStr = `${config.localPort}:${backendHost}:${config.remotePort}`;
                      this.listeningServers.set(`${backendId}:${ind}`, serv);
                      resolve(connStr);
                    });
                  }
                );
              } catch (err) {
                reject(err);
              }
            })
        )
      );
    } catch (err) {
      //console.error(err);
      throw err;
    }
  }

  public disconnectAll(): void {
    try {
      const conns = Array.from(this.connections);
      const listeners = Array.from(this.listeningServers);
      conns.map((c) => c?.[1]?.end());
      listeners.map((s) => s?.[1]?.close());
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      //console.error(err);
    }
  }

  public disconnect(backendId: string): void {
    const conn = this.connections.get(backendId);
    if (conn) {
      conn.end();
      this.connections.delete(backendId);
    }
    const keys = Array.from(this.listeningServers).filter((k) => k[0].startsWith(backendId));
    keys.map((k) => k?.[1].close());
    keys.map((k) => this.listeningServers.delete(k[0]));
  }
}
