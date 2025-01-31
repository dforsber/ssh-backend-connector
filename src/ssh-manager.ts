/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, ConnectConfig } from "ssh2";
import { SSHStoreManager } from "./ssh-store";
import { SSHManagerConfig, TunnelConfig } from "./types";
import { createServer, Server } from "node:net";

export class SSHManager {
  private store: SSHStoreManager;
  private readonly maxConnectionAttempts: number;
  private readonly attemptResetTimeMs: number;
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
    this.maxConnectionAttempts = config?.maxConnectionAttempts ?? 5;
    this.attemptResetTimeMs = config?.attemptResetTimeMs ?? 10_000; // 10s
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
      readyTimeout: this.connectionTimeout,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      tryKeyboard: false,
      algorithms: {
        kex: ["curve25519-sha256@libssh.org", "ecdh-sha2-nistp256", "diffie-hellman-group14-sha1"],
        cipher: ["aes128-gcm@openssh.com", "aes256-gcm@openssh.com", "aes128-ctr"],
        compress: ["none"],
      },
    };

    // Add more event listeners for debugging
    conn.on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
      console.log("Keyboard interactive auth requested");
      finish([]);
    });

    conn.on("handshake", (negotiated) => {
      console.log("SSH Handshake completed", negotiated);
    });

    conn.on("close", () => {
      console.log("Connection closed");
      this.connections.delete(backendId);
    });

    return new Promise((resolve, reject) => {
      let isResolved = false;

      // Set connection timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          console.log("Connection timeout triggered");
          isResolved = true;
          conn.end();
          reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
        }
      }, this.connectionTimeout);

      conn
        .on("ready", async () => {
          console.log("Connection ready event fired");
          clearTimeout(timeoutId);
          if (isResolved) return;
          try {
            console.log("Setting up tunnels...");
            await this.setupTunnels(conn, backend.id, backend.host, backend.tunnels ?? []);
            console.log("Tunnels setup completed");

            this.connections.set(backendId, conn);
            isResolved = true;
            resolve(conn);
          } catch (err) {
            console.error("Error in tunnel setup:", err);
            if (!isResolved) {
              isResolved = true;
              conn.end();
              reject(err);
            }
          }
        })
        .on("error", (err) => {
          console.error("Connection error:", err);
          clearTimeout(timeoutId);
          if (!isResolved) {
            isResolved = true;
            conn.end();
            reject(err);
          }
        })
        .connect(connParams);

      console.log("Connection attempt initiated");
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
                  "localhost",
                  config.remotePort,
                  (err, stream) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    const serv = createServer((sock) => {
                      // Optimize client socket
                      sock.setNoDelay(true);
                      //sock.setKeepAlive(true, 1000);
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
      this.closeTunnels(backendId);
      throw err;
    }
  }

  // Add this cleanup method
  private closeTunnels(backendId: string): void {
    for (const [key, server] of this.listeningServers.entries()) {
      if (key.startsWith(`${backendId}:`)) {
        if (server?.close) server?.close();
        this.listeningServers.delete(key);
      }
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
