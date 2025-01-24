const { SSHStoreManager, SSHManager } = require("../../");

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
    keyPairId: "key1",
  };

  try {
    // Create and save an SSH key pair first
    const keyPair = {
      id: "key1",
      privateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAtdYBqUY6HQ4GwRyEHj4DXXTGKo1JGDzh4GUbKMqV/TgKDtG0QhPX
1mQJsWQJqUX1t4IvXZPd5C5NBH4oITYeUi2dx8Bz7XBSHuQDUF6qvB0i/V9ZHxAZGZhC+g
sFHvGzxOEzlO6kgVLrZZAR1wlQFRODZXNRGQQhUxQVUXVEVXQVFVEFVEFVEFVEFVEFVEFV
EFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVx
AAAAMBAAEAAAGBAJwZxph5VK6RKwjHXEXHXHHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHX
HXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHx
HXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHXHx
AAAAwQC12gGpRjodDgbBHIQePgNddMYqjUkYPOHgZRsoypX9OAoO0bRCE9fWZAmxZAmpRf
W3gi9dk93kLk0EfigjNh5SLZ3HwHPtcFIe5ANQXqq8HSL9X1kfEBkZmEL6CwUe8bPE4TOU
7qSBUutlkBHXCVAVE4Nlc1EZBCFTFBVRdURVdBUVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQV
UQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVXEAAAAMEAvdoB
qUY6HQ4GwRyEHj4DXXTGKo1JGDzh4GUbKMqV/TgKDtG0QhPX1mQJsWQJqUX1t4IvXZPd5C
5NBH4oITYeUi2dx8Bz7XBSHuQDUF6qvB0i/V9ZHxAZGZhC+gsFHvGzxOEzlO6kgVLrZZAR
1wlQFRODZXNRGQQhUxQVUXVEVXQVFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVE
FVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVEFVxAAAAAwQC92gGpRjodDgbBH
IQePgNddMYqjUkYPOHgZRsoypX9OAoO0bRCE9fWZAmxZAmpRfW3gi9dk93kLk0EfigjNh5
SLZ3HwHPtcFIe5ANQXqq8HSL9X1kfEBkZmEL6CwUe8bPE4TOU7qSBUutlkBHXCVAVE4Nlc
1EZBCFTFBVRdURVdBUVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQV
UQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVXEAAAAAAECAwQF
-----END OPENSSH PRIVATE KEY-----`,
      publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC11gGpRjodDgbBHIQePgNddMYqjUkYPOHgZRsoypX9OAoO0bRCE9fWZAmxZAmpRfW3gi9dk93kLk0EfigjNh5SLZ3HwHPtcFIe5ANQXqq8HSL9X1kfEBkZmEL6CwUe8bPE4TOU7qSBUutlkBHXCVAVE4Nlc1EZBCFTFBVRdURVdBUVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVUQVXE example@localhost",
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
