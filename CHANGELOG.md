## [1.3.2](https://github.com/forgesworn/nsec-tree/compare/v1.3.1...v1.3.2) (2026-03-18)


### Bug Fixes

* **event:** reject proof events with missing or mismatched p tag ([4f5b034](https://github.com/forgesworn/nsec-tree/commit/4f5b0349e3945739b11437ab5b187118634c7b7c))

## [1.3.1](https://github.com/forgesworn/nsec-tree/compare/v1.3.0...v1.3.1) (2026-03-18)


### Bug Fixes

* **event:** harden fromEvent input validation against malformed events ([c9d96a8](https://github.com/forgesworn/nsec-tree/commit/c9d96a8767bed86c8632d2817abff697e7962543))

# [1.3.0](https://github.com/forgesworn/nsec-tree/compare/v1.2.0...v1.3.0) (2026-03-18)


### Features

* **event:** add event subpath export and re-export from index ([8d406c6](https://github.com/forgesworn/nsec-tree/commit/8d406c673cd183e9293cdc29af9c0f19660f715b))
* **event:** implement fromEvent for parsing NIP-78 linkage proof events ([70b1928](https://github.com/forgesworn/nsec-tree/commit/70b1928f428c9273d133fc7b2f59b21f8e1cd591))
* **event:** implement toUnsignedEvent for linkage proof publishing ([5a0591c](https://github.com/forgesworn/nsec-tree/commit/5a0591c5906385133f8117f7c49bae96d8ce381a))
* **event:** scaffold event module with constants and UnsignedEvent type ([08a07a1](https://github.com/forgesworn/nsec-tree/commit/08a07a11c104a041a731f94aa1bb6fca5ef9419f))

# [1.2.0](https://github.com/forgesworn/nsec-tree/compare/v1.1.0...v1.2.0) (2026-03-18)


### Features

* add encoding subpath export for NIP-19 utilities ([6068770](https://github.com/forgesworn/nsec-tree/commit/606877091782b079d462b37cf7262c3a6074868f))

# [1.1.0](https://github.com/forgesworn/nsec-tree/compare/v1.0.0...v1.1.0) (2026-03-18)


### Bug Fixes

* use source barrel import in persona subpath test (CI has no dist/) ([7283d07](https://github.com/forgesworn/nsec-tree/commit/7283d0718ff01b8b169a001e05fcbc080a7bac82))


### Features

* add deriveFromPersona two-level hierarchy ([033c67e](https://github.com/forgesworn/nsec-tree/commit/033c67edcd141d375ca2f9ee7ecda47bb8df4f87))
* add derivePersona core function ([33d112f](https://github.com/forgesworn/nsec-tree/commit/33d112f688c83b78381887c31be42eb1e1b6e2ca))
* add nsec-tree/persona subpath export ([6681f9d](https://github.com/forgesworn/nsec-tree/commit/6681f9d84c10745491e2ee5bd209be95ca46a07e))
* add recoverPersonas with default persona names ([2e2bf2d](https://github.com/forgesworn/nsec-tree/commit/2e2bf2dc4c4e00ca539750b4339e5fb086d166be))

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
