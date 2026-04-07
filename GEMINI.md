# GEMINI.md -- nsec-tree

Deterministic Nostr sub-identity derivation from a single master secret.

## Commands

- `npm install` -- install dependencies (Node.js 22+ required)
- `npm run build` -- compile TypeScript to `dist/`
- `npm test` -- run all tests (vitest)
- `npm run typecheck` -- type-check without emitting

## Dependencies

Runtime only -- all audited @noble/@scure libraries, zero custom crypto:

- `@noble/curves` ^2 -- BIP-340 Schnorr signatures, secp256k1 public key derivation
- `@noble/hashes` ^2 -- HMAC-SHA256 (RFC 2104)
- `@scure/bip32` ^2 -- BIP-32 hierarchical deterministic key derivation
- `@scure/bip39` ^2 -- BIP-39 mnemonic validation and seed generation
- `@scure/base` ^1 -- bech32 encoding/decoding

## Structure

```
src/
  types.ts            -- interfaces (TreeRoot, Identity, LinkageProof, Persona), error class, constants
  encoding.ts         -- NIP-19 bech32 encode/decode (nsec, npub), hex utilities
  validate.ts         -- purpose string validation (non-empty, max 255 bytes, no nulls)
  derive.ts           -- HMAC-SHA256 child key derivation, derive() and zeroise() public API
  derive-identity.ts  -- deriveFromIdentity() for arbitrary-depth hierarchies
  root-nsec.ts        -- fromNsec(), HMAC intermediate, FinalizationRegistry cleanup
  root-mnemonic.ts    -- fromMnemonic() via BIP-32 at m/44'/1237'/727'/0'/0'
  recover.ts          -- scan-based identity recovery across purposes x indices
  proof.ts            -- BIP-340 Schnorr linkage proofs (blind + full)
  persona.ts          -- named persona derivation, two-level hierarchy, recovery
  event.ts            -- NIP-78 Kind 30078 event conversion (toUnsignedEvent, fromEvent)
  index.ts            -- full API barrel re-export
  core.ts             -- no-BIP-deps barrel (must never import root-mnemonic.ts)
  mnemonic.ts         -- fromMnemonic-only barrel
test/
  vectors.test.ts     -- frozen canonical test vectors (never modify)
  compat.test.ts      -- NIP-06 path independence verification
  proof.test.ts       -- linkage proof creation and verification
  persona.test.ts     -- persona derivation, hierarchy, recovery
  event.test.ts       -- NIP-78 event round-trip
  derive-identity.test.ts -- arbitrary-depth hierarchy tests
```

## Subpath Exports

- `nsec-tree` -- full API (all functions, types, constants)
- `nsec-tree/core` -- fromNsec, derive, recover, zeroise (no BIP deps)
- `nsec-tree/mnemonic` -- fromMnemonic only
- `nsec-tree/proof` -- linkage proofs only
- `nsec-tree/persona` -- persona derivation, hierarchy, recovery
- `nsec-tree/event` -- NIP-78 Kind 30078 event conversion
- `nsec-tree/encoding` -- NIP-19 bech32 helpers

ESM-only. `"type": "module"` in package.json. No CJS output.

## Conventions

- British English -- colour, initialise, zeroise, behaviour, licence
- Commits: `type: description` format (feat:, fix:, test:, docs:, chore:). No Co-Authored-By lines.
- Branches -- work on branches; merge to main triggers semantic-release auto-publish to npm.
- TDD -- write failing test first, implement minimal code to pass, verify, commit.

## Key Patterns / Gotchas

- `fromNsec()` applies an HMAC intermediate -- it is NOT the same as using raw nsec bytes directly. The Rust counterpart (`heartwood-core::from_nsec_bytes()`) applies the same step; both sides must produce identical output.
- Purpose strings are validated -- must be non-empty, lowercase alphanumeric with hyphens, underscores, or slashes. Slashes act as namespace separators (e.g. `persona/forgesworn`, `client/bray`).
- `zeroise()` is mandatory -- `TreeRoot` holds secrets in memory until explicitly cleared. The `secret` field is not exposed in the public API.
- `core.ts` must never import `root-mnemonic.ts` -- this constraint keeps BIP-32/39 out of the `nsec-tree/core` subpath. CI enforces it.
- Persona derivation is two-level -- `derivePersona()` derives from the tree root, then persona children derive from the persona. Recovering a persona requires the tree root.
- Two proof forms -- `createBlindProof()` proves two pubkeys share a root without revealing it; `createFullProof()` reveals the full derivation path. Choose based on privacy requirements.
- `test/vectors.test.ts` contains 5 frozen canonical test vectors -- they must never be modified.

## Testing

134 tests across 13 files. Vitest is the test runner.

```bash
npm test            # full suite
npm run test:watch  # watch mode during development
```

Run the full suite before every commit. The canonical test vectors in `test/vectors.test.ts` are immutable -- any change to derivation output that breaks them is a breaking protocol change.

## Release

semantic-release handles versioning and npm publish automatically on push to `main`. Work on branches; only merge when complete.
