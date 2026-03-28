# AGENTS.md -- nsec-tree

Deterministic Nostr sub-identity derivation from a single master secret.

## Build & Test

```bash
npm install        # install dependencies
npm run build      # compile TypeScript (tsc)
npm test           # run all tests (vitest)
npm run typecheck  # type-check without emitting
```

Requires Node.js 22+.

## Architecture

```
src/
  types.ts            -- interfaces (TreeRoot, Identity, LinkageProof, Persona), error class, constants
  encoding.ts         -- NIP-19 bech32 encode/decode (nsec, npub), hex utilities
  validate.ts         -- purpose string validation (non-empty, max 255 bytes, no nulls)
  derive.ts           -- HMAC-SHA256 child key derivation, derive() and zeroise() public API
  derive-identity.ts  -- deriveFromIdentity() for arbitrary-depth hierarchies
  root-nsec.ts        -- fromNsec(), createTreeRoot(), FinalizationRegistry for cleanup
  root-mnemonic.ts    -- fromMnemonic() via BIP-32 at m/44'/1237'/727'/0'/0'
  recover.ts          -- scan-based identity recovery across purposes x indices
  proof.ts            -- BIP-340 Schnorr linkage proofs (blind + full)
  persona.ts          -- named persona derivation, two-level hierarchy, recovery
  event.ts            -- NIP-78 Kind 30078 event conversion (toUnsignedEvent, fromEvent)
  index.ts            -- full API barrel re-export
  core.ts             -- no-BIP-deps barrel (must never import root-mnemonic.ts)
  mnemonic.ts         -- fromMnemonic-only barrel
```

### Key Constraint

`core.ts` must **never** import `root-mnemonic.ts`. This keeps BIP-32/39 dependencies out of the `nsec-tree/core` subpath export.

## Subpath Exports

- `nsec-tree` -- full API (all functions, types, constants)
- `nsec-tree/core` -- fromNsec, derive, recover, zeroise (no BIP deps)
- `nsec-tree/mnemonic` -- fromMnemonic only
- `nsec-tree/proof` -- linkage proofs only
- `nsec-tree/persona` -- persona derivation, hierarchy, recovery
- `nsec-tree/event` -- NIP-78 event conversion
- `nsec-tree/encoding` -- NIP-19 bech32 helpers

## Conventions

- **British English** -- colour, initialise, behaviour, licence, zeroise
- **Git commits:** `type: description` (feat:, fix:, test:, docs:, chore:). No Co-Authored-By lines.
- **Branching:** Work on branches, merge to main only when complete. semantic-release auto-publishes on push to main.
- **TDD:** Write failing test first, implement minimal code to pass, verify, commit.
- **Frozen test vectors** in `test/vectors.test.ts` must never be modified -- they are canonical.

## Crypto Dependencies

All cryptographic operations use audited @noble/@scure libraries:
- `@noble/hashes` -- HMAC-SHA256 (RFC 2104)
- `@noble/curves` -- BIP-340 Schnorr signatures, secp256k1 public key derivation
- `@scure/bip32` -- BIP-32 hierarchical deterministic key derivation
- `@scure/bip39` -- BIP-39 mnemonic validation and seed generation
- `@scure/base` -- bech32 encoding/decoding

**Zero custom crypto.** The only novel element is the HMAC message format (domain-separated with null bytes), which is fully specified in PROTOCOL.md.

## Security

- See SECURITY.md for vulnerability reporting (security@forgesworn.dev)
- Every change touching key material, derivation, or proofs gets extra scrutiny
- Zeroisation is mandatory: tree root secrets, BIP-39 seeds, BIP-32 intermediates, and child private keys
- String encodings (bech32) cannot be zeroed in JS -- security-sensitive code should use raw byte arrays

## Testing

134 tests across 13 files. Vitest is the test runner. Run the full suite before every commit.

Key test files:
- `test/vectors.test.ts` -- 5 frozen canonical test vectors (NEVER modify)
- `test/compat.test.ts` -- NIP-06 path independence verification
- `test/proof.test.ts` -- linkage proof creation and verification
- `test/persona.test.ts` -- persona derivation, hierarchy, recovery
- `test/event.test.ts` -- NIP-78 event round-trip
- `test/derive-identity.test.ts` -- arbitrary-depth hierarchy tests
