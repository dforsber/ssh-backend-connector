#!/bin/bash
set -e

# Create directory for test keys
mkdir -p examples/test-keys

# Generate SSH key pair
ssh-keygen -t rsa -b 2048 -C "test@example.com" -f examples/test-keys/id_rsa -N ""

# Read the keys into variables for the examples
PRIVATE_KEY=$(cat examples/test-keys/id_rsa)
PUBLIC_KEY=$(cat examples/test-keys/id_rsa.pub)

# Create a JavaScript module with the keys
cat > examples/test-keys/keys.js << EOL
export const testKeys = {
  privateKey: \`${PRIVATE_KEY}\`,
  publicKey: \`${PUBLIC_KEY}\`
};
EOL

# Create TypeScript declaration file
cat > examples/test-keys/keys.d.ts << EOL
export interface TestKeys {
  privateKey: string;
  publicKey: string;
}

export const testKeys: TestKeys;
EOL

# Create a CommonJS module with the keys
cat > examples/test-keys/keys.cjs << EOL
module.exports = {
  testKeys: {
    privateKey: \`${PRIVATE_KEY}\`,
    publicKey: \`${PUBLIC_KEY}\`
  }
};
EOL
