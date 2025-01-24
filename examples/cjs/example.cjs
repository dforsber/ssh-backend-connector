const { SSHStoreManager, SSHManager } = require("ssh-backend-connector");

async function main() {
  // Initialize the store manager with a custom path
  const storeManager = new SSHStoreManager("./ssh-store.json");
  
  // Connect with a password
  await storeManager.connect("your-secure-password");
  
  // Create an SSH manager instance
  const sshManager = new SSHManager(storeManager);
  
  // Example backend configuration
  const backend = {
    id: "example-server",
    name: "Example Server",
    host: "example.com",
    port: 22,
    username: "user",
    keyPairId: "key1"
  };
  
  try {
    // Save the backend configuration
    await storeManager.saveBackend(backend);
    
    // Connect to the backend
    const connection = await sshManager.connect(backend.id);
    console.log("Connected successfully!");
    
    // Setup a tunnel
    await sshManager.setupTunnel(backend.id, {
      remotePort: 5432,
      localPort: 54320
    });
    
    // Cleanup
    sshManager.disconnect(backend.id);
    storeManager.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
