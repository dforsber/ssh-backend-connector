import { SSHStoreManager, SSHManager, Backend } from "../../";

async function main(): Promise<void> {
  // Initialize the store manager with a custom path
  const storeManager = new SSHStoreManager("./ssh-store.json");

  // Connect with a password
  await storeManager.connect("your-secure-password");

  // Create an SSH manager instance
  const sshManager = new SSHManager(storeManager);

  // Example backend configuration
  const backend: Backend = {
    id: "example-server",
    name: "Example Server",
    host: "example.com",
    port: 22,
    username: "user",
    keyPairId: "key1",
  };

  try {
    // Create and save an SSH key pair first
    const keyPair = {
      id: "key1",
      privateKey: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----",
      publicKey: "ssh-rsa AAAA...",
      name: "Example Key"
    };
    await storeManager.saveKeyPair(keyPair);

    // Save the backend configuration
    await storeManager.saveBackend(backend);

    // Connect to the backend
    const connection = await sshManager.connect(backend.id);
    console.log("Connected successfully!");

    // Setup a tunnel
    await sshManager.setupTunnel(backend.id, {
      remotePort: 5432,
      localPort: 54320,
    });

    // Cleanup
    sshManager.disconnect(backend.id);
    storeManager.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
