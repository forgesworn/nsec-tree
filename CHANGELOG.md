# 1.0.0 (2026-03-18)


### Bug Fixes

* export MAX_SCAN_RANGE, add decode payload-length test ([20553e8](https://github.com/forgesworn/nsec-tree/commit/20553e88228a4b99b18daa2957f6f959c3e8a8d7))
* input validation for index and scanRange parameters ([d2929a3](https://github.com/forgesworn/nsec-tree/commit/d2929a39ad7c66fb5e3279810a8b70832d005cf6))
* input validation hardening and security test coverage ([2de8b7f](https://github.com/forgesworn/nsec-tree/commit/2de8b7f08dcbbb9f09a9785fd19ddabf82167a37))
* remove NPM_TOKEN reference from CI, use OIDC provenance only ([22c7dee](https://github.com/forgesworn/nsec-tree/commit/22c7dee062b6ef9c926ba6d7177f60dcad94d8f6))
* remove unused createTreeRoot import from root tests ([8c11d08](https://github.com/forgesworn/nsec-tree/commit/8c11d082e9617291a9df97bebc44f8d8c5364968))
* verify proof fields match attestation, harden test setup ([426f2fc](https://github.com/forgesworn/nsec-tree/commit/426f2fc0efad47f9e0ee2236b0a7db13c8ccc91b))
* zeroisation gaps, CI hardening, gitignore, release config ([09b0eab](https://github.com/forgesworn/nsec-tree/commit/09b0eab0257294c6a93bc68aebd77ae36fca48e7))


### Features

* add core type definitions ([bbbf28c](https://github.com/forgesworn/nsec-tree/commit/bbbf28c5078d9db4722c13692051ae2eac94ab90))
* BIP-340 Schnorr linkage proofs (blind + full) ([30ba0e7](https://github.com/forgesworn/nsec-tree/commit/30ba0e7d000629b0c63138ae1bee2ad487d0bf0c))
* derive() and zeroise() public API ([ddd741a](https://github.com/forgesworn/nsec-tree/commit/ddd741a2ee17572271c70b8a09b0d8652a9a67e8))
* frozen canonical test vectors ([2c592be](https://github.com/forgesworn/nsec-tree/commit/2c592be61875ca6169524ebc780734531a1195c1))
* HMAC-SHA256 child key derivation engine ([5893363](https://github.com/forgesworn/nsec-tree/commit/58933637a62c0152fa472c0ab5409f8dc3500841))
* NIP-19 bech32 encoding (nsec/npub) ([2aa7a6b](https://github.com/forgesworn/nsec-tree/commit/2aa7a6b6c59c709fe73f0e00567e2e0e24d3d8f3))
* purpose string validation ([4f70a5b](https://github.com/forgesworn/nsec-tree/commit/4f70a5b84ed3d821b26a575ab9fdd8376de5fc99))
* recovery scanning across purpose strings ([df75353](https://github.com/forgesworn/nsec-tree/commit/df75353287569b05fcf9936eb89df0a73e8a9f98))
* subpath exports (core, mnemonic, proof) ([f8feb85](https://github.com/forgesworn/nsec-tree/commit/f8feb8590a4d799ed5eeea65ad5b5a2c51038702))
* TreeRoot creation from BIP-39 mnemonic ([7164404](https://github.com/forgesworn/nsec-tree/commit/71644047a7d3ea664bdc449cd5872386ab47faee))
* TreeRoot creation from nsec with intermediate HMAC ([9880edb](https://github.com/forgesworn/nsec-tree/commit/9880edbaec4bc89f7e202575be01cb4299d0ecba))
