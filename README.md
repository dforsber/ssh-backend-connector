# SSH Backend Connector

Secure SSH backend connection manager for Electron applications with encrypted key storage.

## Install

```bash
npm install ssh-backend-connector
```

## Usage

```typescript
import { SSHStoreManager, SSHManager } from "ssh-backend-connector";

// Store SSH keys
const store = new SSHStoreManager();
store.saveKeyPair({
  id: "prod-key",
  name: "Production Server",
  privateKey: "-----BEGIN RSA PRIVATE KEY-----...",
  publicKey: "ssh-rsa AAAA...",
});

// Store backend config
store.saveBackend({
  id: "prod",
  name: "Production",
  host: "192.168.1.100",
  port: 22,
  username: "admin",
  keyPairId: "prod-key",
});

// Connect and setup tunnel
const ssh = new SSHManager();
await ssh.connect("prod");
await ssh.setupTunnel("prod", {
  remotePort: 3000,
  localPort: 8080,
});

// Cleanup
ssh.disconnect("prod");
```

## API

- `SSHStoreManager`: Encrypted storage for SSH keys and backend configs
- `SSHManager`: SSH connection and tunnel management

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
