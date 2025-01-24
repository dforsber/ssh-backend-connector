# SSH Backend Connector

[![Coverage](https://codecov.io/gh/OWNER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/OWNER/REPO)

> Secure SSH backend connection manager for Electron applications with encrypted key storage.

🔒 **100% Test Coverage** | 🛡️ **Type-Safe** | 🔐 **AES-256-GCM Encryption**

## Features

- Secure AES-256-GCM encryption for SSH keys
- Password-based key derivation using scrypt
- Automatic cleanup of sensitive data
- Encrypted local storage of SSH keys and configurations
- SSH tunnel management

## Install

```bash
npm install ssh-backend-connector
```

## Usage

```typescript
import { SSHStoreManager, SSHManager } from "ssh-backend-connector";

// Initialize store with encryption
const store = new SSHStoreManager();
await store.connect("your-secure-password"); // At least 12 characters

try {
  // Store SSH keys (encrypted)
  await store.saveKeyPair({
    id: "prod-key",
    name: "Production Server",
    privateKey: "-----BEGIN RSA PRIVATE KEY-----...",
    publicKey: "ssh-rsa AAAA...",
  });

  // Store backend config
  await store.saveBackend({
    id: "prod",
    name: "Production",
    host: "192.168.1.100",
    port: 22,
    username: "admin",
    keyPairId: "prod-key",
  });

  // Create SSH manager with the store
  const ssh = new SSHManager(store);
  
  // Connect and setup tunnel
  await ssh.connect("prod");
  await ssh.setupTunnel("prod", {
    remotePort: 3000,
    localPort: 8080,
  });

  // When done, cleanup
  ssh.disconnect("prod");
  store.disconnect(); // Clears sensitive data from memory
} catch (error) {
  console.error('Error:', error);
}
```

## API

### SSHStoreManager
- `connect(password: string)`: Initialize encryption with password
- `disconnect()`: Clear sensitive data from memory
- `saveKeyPair(keyPair: SSHKeyPair)`: Store encrypted SSH key pair
- `getKeyPair(id: string)`: Retrieve and decrypt key pair
- `getAllKeyPairs()`: List all key pairs
- `deleteKeyPair(id: string)`: Remove key pair
- `saveBackend(backend: Backend)`: Store backend configuration
- `getBackend(id: string)`: Retrieve backend config
- `getAllBackends()`: List all backends
- `deleteBackend(id: string)`: Remove backend config

### SSHManager
- `constructor(store: SSHStoreManager)`: Create manager with store
- `connect(backendId: string)`: Establish SSH connection
- `setupTunnel(backendId: string, config: TunnelConfig)`: Create SSH tunnel
- `disconnect(backendId: string)`: Close connection

## Security

This package takes security seriously:

✓ Passwords must be at least 12 characters  
✓ Keys are encrypted using AES-256-GCM  
✓ Sensitive data is automatically cleared from memory  
✓ Password is never stored in memory  
✓ Encryption is verified on connection  
✓ 100% test coverage ensures reliable security features

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
