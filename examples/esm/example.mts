import { SSHStoreManager, SSHManager } from "../../dist/esm/index.js";
import type { Backend } from "../../dist/esm/types.js";

async function main(): Promise<void> {
  try {
    // Initialize the store manager with a custom path
    const storeManager = new SSHStoreManager("./ssh-store.json");

    // Connect with a password
    await storeManager.connect("your-Secure-password_888");

    // Example backend configuration
    const backend: Backend = {
      id: "example-server",
      name: "Example Server",
      host: "example.com",
      port: 22,
      username: "user",
      keyPairId: "key1",
    };

    // Create and save an SSH key pair first
    // Import the test keys
    const { testKeys } = await import("../test-keys/keys.js");
    const keyPair = {
      id: "key1",
      privateKey: testKeys.privateKey,
      publicKey: testKeys.publicKey,
      name: "Example Key",
    };
    await storeManager.saveKeyPair(keyPair);

    // Save the backend configuration
    await storeManager.saveBackend(backend);

    // Create an SSH manager instance with custom configuration
    const sshManager = new SSHManager(storeManager, {
      connectionTimeout: 20000, // 20 seconds
      maxConcurrentConnections: 5, // Maximum 5 concurrent connections
    });
    const connection = await sshManager.connect(backend.id);
    console.log("Connected successfully!");

    // Setup a tunnel
    await sshManager.setupTunnel(backend.id, [
      {
        remotePort: 5432,
        localPort: 54320,
      },
    ]);

    // Cleanup
    sshManager.disconnect(backend.id);
    storeManager.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
