# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.5.28](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.27...v0.5.28) (2025-02-05)

### [0.5.27](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.26...v0.5.27) (2025-02-05)

### [0.5.26](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.25...v0.5.26) (2025-02-05)

### [0.5.25](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.24...v0.5.25) (2025-01-31)

### [0.5.24](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.23...v0.5.24) (2025-01-30)

### [0.5.23](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.22...v0.5.23) (2025-01-29)

### [0.5.22](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.21...v0.5.22) (2025-01-29)


### Features

* Add comprehensive test for SSH tunnel stream piping and server setup ([948c87d](https://github.com/dforsber/ssh-backend-connector/commit/948c87d86d8175f437b29d30ddebeec98d995655))


### Bug Fixes

* Add type annotation to net.createServer mock handler in test ([a0cf3ff](https://github.com/dforsber/ssh-backend-connector/commit/a0cf3ff0464723a89905c837295baaa98c84ab62))
* Correct ClientChannel type in SSH manager test mocks ([3f291a5](https://github.com/dforsber/ssh-backend-connector/commit/3f291a5704934bcf690015de4308b7c184c003a1))
* Handle socket connection error in SSH tunnel test ([bd6dfe3](https://github.com/dforsber/ssh-backend-connector/commit/bd6dfe354d16651e227fe559e7e364f0d1600534))
* Handle SSH tunnel errors and properly clean up connections ([bb7b89d](https://github.com/dforsber/ssh-backend-connector/commit/bb7b89dc43c11349badf7b87c69ccfe783b4f6a6))
* Handle SSH tunnel setup errors correctly in connection process ([11fa7a1](https://github.com/dforsber/ssh-backend-connector/commit/11fa7a1eb30d5807e689d6bff4a889fd0c0a8499))
* Handle SSH tunnel setup failure and improve error handling ([4768550](https://github.com/dforsber/ssh-backend-connector/commit/47685500c408065a2b8fa05b64a0f7c503fdc972))
* Improve SSH tunnel error handling in connection test ([2f41d5e](https://github.com/dforsber/ssh-backend-connector/commit/2f41d5e94620664f889003afab52a3e0233677af))
* Remove redundant server creation code in SSH tunnel setup ([9fca6ef](https://github.com/dforsber/ssh-backend-connector/commit/9fca6efe9a4be9296add23f6686d3c6bf2dbf48f))
* Restore mockClient.forwardOut after test to prevent side effects ([0af46c6](https://github.com/dforsber/ssh-backend-connector/commit/0af46c6bcb7a23c91f0cecbabb7933fe1974f89e))

### [0.5.21](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.20...v0.5.21) (2025-01-29)

### [0.5.20](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.19...v0.5.20) (2025-01-28)

### [0.5.19](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.18...v0.5.19) (2025-01-28)

### [0.5.18](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.17...v0.5.18) (2025-01-28)

### [0.5.17](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.16...v0.5.17) (2025-01-28)

### [0.5.16](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.15...v0.5.16) (2025-01-28)

### [0.5.15](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.14...v0.5.15) (2025-01-27)

### [0.5.14](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.13...v0.5.14) (2025-01-24)


### Features

* Add configurable SSH connection timeout and max concurrent connections ([4a8f304](https://github.com/dforsber/ssh-backend-connector/commit/4a8f304b81bfdd7213aa84d30064d9a002d8468c))
* Add file size limit to JSONStore with 200MB default ([8ae6771](https://github.com/dforsber/ssh-backend-connector/commit/8ae6771093a088f30bae52c542c86613e115c11b))
* Add password length limit and improve scrypt key derivation parameters ([2d7208e](https://github.com/dforsber/ssh-backend-connector/commit/2d7208e01181468aff050b030f60ec1ff54f161f))
* Enhance security with file permissions, password complexity, and rate limiting ([54ac952](https://github.com/dforsber/ssh-backend-connector/commit/54ac952673fd4dded5ef0a19faf4738514ff3095))


### Bug Fixes

* Adjust scrypt parameters to valid ranges for better compatibility ([de54be0](https://github.com/dforsber/ssh-backend-connector/commit/de54be0a122c8f48b849fa647d3b7398f17021c7))
* Handle stat() errors in verifyFilePermissions method ([c002423](https://github.com/dforsber/ssh-backend-connector/commit/c0024237aeccab79d646988edca00e4d9698cc4e))
* Improve error handling for file permission verification ([1446261](https://github.com/dforsber/ssh-backend-connector/commit/144626127d26e091baf20feeb4269573c0206340))
* Improve error handling in file permissions verification ([96fe224](https://github.com/dforsber/ssh-backend-connector/commit/96fe224cb649fb5e9c126d0ed9988bbbddc3edb8))
* Improve error handling in verifyFilePermissions method ([b1959f5](https://github.com/dforsber/ssh-backend-connector/commit/b1959f5beed37459b7a7b11d00c7cbac4adcd3b8))
* Propagate original errors in file permission verification ([e65b86f](https://github.com/dforsber/ssh-backend-connector/commit/e65b86f470fb9c812e231cd6d55beb036176baeb))
* Resolve TypeScript spread type error in json-store test ([1286638](https://github.com/dforsber/ssh-backend-connector/commit/12866382f19d2bf964c010839d7764c7779fe6fc))
* Simplify file permissions error handling to match test expectations ([7b60545](https://github.com/dforsber/ssh-backend-connector/commit/7b6054595579dc1d44080277699ea94388e40241))
* Simplify file permissions verification error handling ([3beb545](https://github.com/dforsber/ssh-backend-connector/commit/3beb5457c928e4124742f8a17541cfcf3e7bcd85))
* Validate file size before setting data in JSONStore ([9cb1308](https://github.com/dforsber/ssh-backend-connector/commit/9cb1308551f7348f08c2b8b6204010a75109809f))

### [0.5.13](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.12...v0.5.13) (2025-01-24)


### Features

* Add ESM and CJS example files with TypeScript configuration ([c20d36c](https://github.com/dforsber/ssh-backend-connector/commit/c20d36ccdb671ac63d432e311bc1162e9b18bfd4))
* Add ESM module support for examples with package.json and tsconfig updates ([38a15bb](https://github.com/dforsber/ssh-backend-connector/commit/38a15bb0ecea4e8c81914390d0517172ecff0821))
* Add SSH key pair generation to example scripts ([75bb9ff](https://github.com/dforsber/ssh-backend-connector/commit/75bb9ff9daaae1957e906a73374a4940bcc810d8))
* Add TypeScript declaration file for test keys module ([f692767](https://github.com/dforsber/ssh-backend-connector/commit/f692767f68468703adf15978c5e4673d8e4a0247))
* Add TypeScript type generation to build process ([b52f880](https://github.com/dforsber/ssh-backend-connector/commit/b52f880aa04b32d3fc9d0b62f78de878407b021a))
* Generate dynamic test SSH keys for examples ([33cc907](https://github.com/dforsber/ssh-backend-connector/commit/33cc9077216de4512a2e17fa525c34f336973d85))
* Improve ESM example configuration and add example run script ([d631ccd](https://github.com/dforsber/ssh-backend-connector/commit/d631ccdcf938a898befed10f24267dd997a11fb3))
* Update package.json exports and add module-specific package.json files ([e968ec2](https://github.com/dforsber/ssh-backend-connector/commit/e968ec27dd062e8abe27c891ac0f5f0703b8a261))


### Bug Fixes

* Add --bundle flag to esbuild scripts to resolve external module error ([d3448ef](https://github.com/dforsber/ssh-backend-connector/commit/d3448ef4e9c5d21c1b75d5c0551caa5ab54f56b3))
* Import SSHManager in CJS example ([bbdbce4](https://github.com/dforsber/ssh-backend-connector/commit/bbdbce47d1fc45385598aae22ac669dbd780297b))
* Remove invalid --preserve-modules flag from build scripts ([67f2c73](https://github.com/dforsber/ssh-backend-connector/commit/67f2c7347225afd285f11e22bda2accc955c0b77))
* Remove invalid `--preserve-modules` flag from esbuild script ([b55fcf3](https://github.com/dforsber/ssh-backend-connector/commit/b55fcf315ea8846743e80580e3b1db634baed874))
* Remove unused SSHManager import from example files ([6cd5692](https://github.com/dforsber/ssh-backend-connector/commit/6cd56929f6945c86db86f3ddd31b80a6391dd055))
* Reorder package.json exports to resolve esbuild type warning ([b122a3e](https://github.com/dforsber/ssh-backend-connector/commit/b122a3e45b888b069c7863338a4b56031533a58b))
* Update ESM build config and export paths for proper module resolution ([236a4f5](https://github.com/dforsber/ssh-backend-connector/commit/236a4f5f4ef217777bf1ac644cd66516fcb9eb5f))
* Update ESM example to correctly initialize and connect SSH store manager ([9848117](https://github.com/dforsber/ssh-backend-connector/commit/984811725fb41c1a4aca4d45fea6f4260090fcb9))
* Update ESM import path in example to use dist/esm directory ([8b5f6bf](https://github.com/dforsber/ssh-backend-connector/commit/8b5f6bfa62ef5ca22f8d78d13a29dd76a50f94ec))
* Update import and SSHManager usage in example files ([3dda2a8](https://github.com/dforsber/ssh-backend-connector/commit/3dda2a8cced25f0b7908ed964e556aef9293f774))
* Update import paths and add missing SSHManager import in examples ([b7f937a](https://github.com/dforsber/ssh-backend-connector/commit/b7f937a58b697c220992c24436a28cc1e7f76387))
* Update import paths in ESM example to match package exports ([8c73db0](https://github.com/dforsber/ssh-backend-connector/commit/8c73db0395ec335ce79cad86ec298329ddc67ae8))
* Update module exports and build configuration for ESM compatibility ([4269c52](https://github.com/dforsber/ssh-backend-connector/commit/4269c520346546b5bc43ff14cc1b226db7d9d424))
* Update package exports and build configuration for proper module resolution ([2af71e2](https://github.com/dforsber/ssh-backend-connector/commit/2af71e206f0735dfe1606b2faf485f5935bbbc8a))
* Update package.json exports for better TypeScript module import support ([77b4879](https://github.com/dforsber/ssh-backend-connector/commit/77b487974e97ad6a425fdd913bb0f9ed3671e668))
* Update SSH key pair with valid OpenSSH format in examples ([c2a1940](https://github.com/dforsber/ssh-backend-connector/commit/c2a194077f76b74673b8b09bf286cb447d8ab0f9))

### [0.5.12](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.11...v0.5.12) (2025-01-24)

### [0.5.11](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.10...v0.5.11) (2025-01-24)

### [0.5.10](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.9...v0.5.10) (2025-01-24)


### Bug Fixes

* Add password validation in SSHStoreManager connect method ([21b8f5e](https://github.com/dforsber/ssh-backend-connector/commit/21b8f5e01c30c3c6a4d2293f91ea820ca170dcc1))
* Adjust salt length validation from 16 to 8 bytes ([3ae049e](https://github.com/dforsber/ssh-backend-connector/commit/3ae049e3259db07792301bcaab0523d70320eff7))
* Correct IV length in crypto-wrapper test case ([2aba1b5](https://github.com/dforsber/ssh-backend-connector/commit/2aba1b58fe1e98094017ff76f5dc1e1388b564ff))
* Correct salt length validation in crypto-wrapper ([236ded0](https://github.com/dforsber/ssh-backend-connector/commit/236ded0f4280dec3e3d2e0cf5f71d81b7a083e06))
* Enhance path traversal validation in JSONStore ([3c12d93](https://github.com/dforsber/ssh-backend-connector/commit/3c12d93269bb2b8616587cc7c11111500e879126))
* Enhance path traversal validation in JSONStore ([b9446b5](https://github.com/dforsber/ssh-backend-connector/commit/b9446b5f2d0fa56a9cf7abf2b7a920285c3b5408))
* Handle crypto key generation failure and improve test verification ([06ca4b9](https://github.com/dforsber/ssh-backend-connector/commit/06ca4b9c0e0e66fc2c14153cc645a2fca6788cbf))
* Handle crypto verification failure in SSHStoreManager test ([0e2a680](https://github.com/dforsber/ssh-backend-connector/commit/0e2a6809582e5b941c2f6e123c431fb52d9b0016))
* Improve crypto verification test with proper mocking and cleanup ([f91d531](https://github.com/dforsber/ssh-backend-connector/commit/f91d531ec7ed8ed264b2357f55aef54dd9404409))
* Improve error handling in crypto key generation ([0138353](https://github.com/dforsber/ssh-backend-connector/commit/0138353d4586cf67af424785cb52361312dd5363))
* Improve path traversal validation in JSONStore constructor ([5ff1eee](https://github.com/dforsber/ssh-backend-connector/commit/5ff1eeeb4310eb50eb6d27d3fcb501c741db69af))
* Prevent path traversal by checking for '..' in file path ([01da19d](https://github.com/dforsber/ssh-backend-connector/commit/01da19d9f276de9b56fdff4c99ad182cd3c8b2c5))
* Propagate errors in JSONStore init method ([85abddc](https://github.com/dforsber/ssh-backend-connector/commit/85abddc96823db056eef80f7b251ec1bbcbad7b9))
* Propagate original crypto verification error in CryptoWrapper ([1d9199f](https://github.com/dforsber/ssh-backend-connector/commit/1d9199f5dba8370d5f4cc0b214c863afdce728e4))
* Propagate original error in CryptoWrapper key generation ([1e04df7](https://github.com/dforsber/ssh-backend-connector/commit/1e04df7a0f0b307164d335ce910b9536a725098d))
* Resolve potential crypto initialization issue in SSHStoreManager ([7fc1bcb](https://github.com/dforsber/ssh-backend-connector/commit/7fc1bcb2ce02b4a84ba552e7a48716a386e597ca))
* Update salt length in crypto wrapper test ([9de314e](https://github.com/dforsber/ssh-backend-connector/commit/9de314e30b750e936a7389adec00c02549625c0d))
* Validate JSON store format to ensure object type ([d78b85f](https://github.com/dforsber/ssh-backend-connector/commit/d78b85f558885e3b70e737b32f4822d614e92e97))

### [0.5.9](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.8...v0.5.9) (2025-01-24)

### [0.5.8](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.7...v0.5.8) (2025-01-24)

### [0.5.7](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.6...v0.5.7) (2025-01-23)

### [0.5.6](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.5...v0.5.6) (2025-01-23)

### [0.5.5](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.4...v0.5.5) (2025-01-23)

### [0.5.4](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.3...v0.5.4) (2025-01-23)

### [0.5.3](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.2...v0.5.3) (2025-01-23)

### [0.5.2](https://github.com/dforsber/ssh-backend-connector/compare/v0.5.1...v0.5.2) (2025-01-23)

### 0.5.1 (2025-01-23)


### Bug Fixes

* Improve SSH tunnel error handling in forwardIn and forwardOut ([1344493](https://github.com/dforsber/ssh-backend-connector/commit/1344493554ac41453af7a9ed91f7a0a57fec4105))
* Prevent forwardOut call when forwardIn fails in SSH tunnel setup ([3b35914](https://github.com/dforsber/ssh-backend-connector/commit/3b359149a46ade00a2074fad7b3f2e42deaa363b))
