# SSH Backend Connector

> Secure SSH backend connection manager for applications with password protected encrypted key storage.

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

// Store SSH keys (encrypted)
await store.saveKeyPair({
  id: "prod-key",
  name: "Production Server",
  privateKey: "-----BEGIN RSA PRIVATE KEY-----...",
});

// Store backend config
await store.saveBackend({
  id: "prod",
  name: "Production",
  host: "192.168.1.100",
  port: 22,
  username: "admin",
  keyPairId: "prod-key",
  tunnels: [{ localPort: 1234, remotePort: 4321 }],
});

// Create SSH manager with the store
const ssh = new SSHManager(store);

// Connect and setup tunnel
await ssh.connect("prod");

// When done, cleanup
ssh.disconnect("prod");
store.disconnect(); // Clears sensitive data from memory
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
- `disconnect(backendId: string)`: Close connection

## Security

This package takes security seriously:

✓ Passwords must be at least 12 characters with complexity requirements  
✓ Keys are encrypted using AES-256-GCM  
✓ Sensitive data is automatically cleared from memory  
✓ Password is never stored in memory  
✓ Encryption is verified on connection  
✓ Rate limiting on connection attempts  
✓ Connection timeouts to prevent hanging  
✓ Maximum concurrent connections limit  
✓ File size limits to prevent DoS  
✓ Secure file permissions (0600)  
✓ Path traversal protection

### Future Security Improvements

Here is a list of potential future work items in the security area:

- **Crypto Versioning**

  - Version tags for encrypted data
  - Support for key rotation
  - Crypto algorithm negotiation

- **SSH Security**

  - SSH key format validation
  - Host key verification
  - Certificate validation support

- **Advanced Security Features**
  - Audit logging
  - Intrusion detection
  - Automated backup/restore
  - Key expiration and rotation policies

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
