const { SSHStoreManager, SSHManager } = require("../../dist/cjs/index.js");

async function main() {
  // Initialize the store manager with a custom path
  const storeManager = new SSHStoreManager("./ssh-store.json");

  // Connect with a password
  await storeManager.connect("your-SECURE-password-123123");

  // Create an SSH manager instance
  const sshManager = new SSHManager(storeManager);

  // Example backend configuration
  const portForwarding = {
    remotePort: 5432,
    localPort: 54320,
  };
  const backend = {
    id: "example-server",
    name: "Example Server",
    host: "example.com",
    port: 22,
    username: "user",
    keyPairId: "key1",
    data: JSON.stringify(portForwarding),
  };

  try {
    // Create and save an SSH key pair first
    // Import the test keys
    const { testKeys } = require("../test-keys/keys.cjs");
    const keyPair = {
      id: "key1",
      privateKey: testKeys.privateKey,
      name: "Example Key",
    };
    await storeManager.saveKeyPair(keyPair);

    // Save the backend configuration
    await storeManager.saveBackend(backend);

    // Connect to the backend
    const connection = await sshManager.connect(backend.id);
    console.log("Connected successfully!");

    // Setup a tunnel
    await sshManager.setupTunnel(backend.id, [portForwarding]);

    // Cleanup
    sshManager.disconnect(backend.id);
    storeManager.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
