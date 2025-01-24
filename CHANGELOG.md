# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
