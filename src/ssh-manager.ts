import { Client } from "ssh2";
import { SSHStoreManager } from "./ssh-store.js";

export class SSHManager {
  private store: SSHStoreManager;
  private connections: Map<string, Client>;

  constructor(store?: SSHStoreManager) {
    this.store = store || new SSHStoreManager();
    this.connections = new Map();
  }

  async connect(backendId: string): Promise<Client> {
    const backend = this.store.getBackend(backendId);
    if (!backend) throw new Error("Backend not found");

    const keyPair = this.store.getKeyPair(backend.keyPairId);
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

  async setupTunnel(backendId: string, remotePort: number): Promise<void> {
    const conn = this.connections.get(backendId);
    if (!conn) throw new Error("Not connected");

    return new Promise((resolve, reject) => {
      conn.forwardIn("127.0.0.1", remotePort, (err) => {
        if (err) reject(err);
        resolve();
      });
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
