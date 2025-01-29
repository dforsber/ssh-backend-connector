import { SSHStoreManager, SSHManager } from "../../dist/esm/index.js";
import type { Backend } from "../../dist/esm/types.js";

async function main(): Promise<void> {
  try {
    // Initialize the store manager with a custom path
    // and connect with a password
    const storeManager = new SSHStoreManager("./ssh-store.json");
    await storeManager.connect("your-Secure-password_888");

    // Example backend configuration
    const backend: Backend = {
      id: "example-server",
      name: "Example Server",
      host: "localhost",
      port: 8022,
      username: "root",
      keyPairId: "key1",
      tunnels: [
        {
          localPort: 8081,
          remotePort: 8081,
        },
      ],
    };
    await storeManager.saveBackend(backend);

    // NOTE: Create and save an SSH key pair first
    // Import the test keys
    const { testKeys } = await import("../test-keys/keys.js");
    const keyPair = {
      id: "key1",
      privateKey: testKeys.privateKey,
      publicKey: testKeys.publicKey,
      name: "Example Key",
    };
    await storeManager.saveKeyPair(keyPair);

    // Create an SSH manager instance with custom configuration
    const sshManager = new SSHManager(storeManager, {
      connectionTimeout: 20000, // 20 seconds
      maxConcurrentConnections: 5, // Maximum 5 concurrent connections
    });
    await sshManager.connect(backend.id);
    console.log("Connected successfully!");

    // Cleanup
    sshManager.disconnect(backend.id);
    storeManager.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
