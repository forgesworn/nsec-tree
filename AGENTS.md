# AGENTS.md -- nsec-tree

Deterministic Nostr sub-identity derivation from a single master secret.

## Build & Test

```bash
npm install        # install dependencies
npm run build      # compile TypeScript (tsc)
npm test           # run all tests (vitest)
npm run typecheck  # type-check without emitting
```

Requires Node.js 22+ (`engines` in `package.json`; CI tests Node 22 and 24).

`nsec-tree/recovery` and `deriveRendezvous` first shipped in `1.6.0`. The
Recovery Words v1 format is still alpha: see RECOVERY.md.

## Architecture

```
src/
  types.ts            -- interfaces (TreeRoot, Identity, LinkageProof), NsecTreeError, constants
  encoding.ts         -- NIP-19 bech32 encode/decode (nsec, npub), hex utilities
  validate.ts         -- purpose validation (non-empty, not whitespace-only, max 255 bytes, no NUL); proof purposes also reject `|` and control characters
  derive.ts           -- HMAC-SHA256 child key derivation, derive() and zeroise() public API
  derive-identity.ts  -- deriveFromIdentity() for arbitrary-depth hierarchies
  root-nsec.ts        -- fromNsec(), createTreeRoot(), FinalizationRegistry for cleanup
  root-mnemonic.ts    -- fromMnemonic() via BIP-32 at m/44'/1237'/727'/0'/0'
  recover.ts          -- scan-based identity recovery across purposes x indices
  proof.ts            -- BIP-340 Schnorr linkage proofs (blind + full)
  persona.ts          -- named persona derivation, two-level hierarchy, recovery (Persona type)
  rendezvous.ts       -- deriveRendezvous(): root-only `rendezvous` child
  event.ts            -- NIP-78 Kind 30078 event conversion (toUnsignedEvent, fromEvent)
  recovery-words.ts   -- typed/versioned human recovery envelope + fingerprint verification
  recovery.ts         -- `nsec-tree/recovery` barrel (re-exports recovery-words.ts)
  index.ts            -- full API barrel re-export
  core.ts             -- no-BIP-deps barrel (must never import root-mnemonic.ts)
  mnemonic.ts         -- fromMnemonic-only barrel
  persona-barrel.ts, event-barrel.ts, encoding-barrel.ts -- subpath barrels for persona, event and encoding
```

### Key Constraint

`core.ts` must **never** import `root-mnemonic.ts`. This keeps BIP-32/39 dependencies out of the `nsec-tree/core` subpath export.

## Subpath Exports

- `nsec-tree` -- full API (all functions, types, constants)
- `nsec-tree/core` -- fromNsec, derive, deriveRendezvous, recover, zeroise, NsecTreeError, constants and the TreeRoot/Identity types (no BIP deps). It does not export `deriveFromIdentity`; the BIP-free equivalent is `derive(fromNsec(parent.privateKey), purpose)`
- `nsec-tree/mnemonic` -- fromMnemonic only
- `nsec-tree/proof` -- linkage proofs only
- `nsec-tree/persona` -- persona derivation, hierarchy, recovery
- `nsec-tree/event` -- NIP-78 event conversion
- `nsec-tree/recovery` -- ForgeSworn recovery-word creation, decoding, and restore (BIP deps; from `1.6.0`)
- `nsec-tree/encoding` -- NIP-19 bech32 helpers

## Conventions

- **British English** -- colour, initialise, behaviour, licence, zeroise
- **Git commits:** `type: description` (feat:, fix:, test:, docs:, chore:). No Co-Authored-By lines.
- **Branching:** Work on branches and merge to main only when complete.
- **Release:** Bump the version and changelog manually, then create a GitHub
  Release for the matching tag. `forgesworn/anvil` runs the gates and publishes
  through npm OIDC. Prereleases must set `publishConfig.tag` so they cannot move
  npm's `latest` tag.
- **TDD:** Write failing test first, implement minimal code to pass, verify, commit.
- **Frozen test vectors** in `test/vectors.test.ts` must never be modified -- they are canonical.
- **Recovery vectors** in `test/recovery-words.test.ts` and `RECOVERY.md` are also frozen and cross-language.

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

Vitest is the test runner (suites live in `test/`). Run the full suite before every commit.

Key test files:
- `test/vectors.test.ts` -- 5 frozen canonical test vectors (NEVER modify)
- `test/compat.test.ts` -- NIP-06 path independence verification
- `test/proof.test.ts` -- linkage proof creation and verification
- `test/persona.test.ts` -- persona derivation, hierarchy, recovery
- `test/event.test.ts` -- NIP-78 event round-trip
- `test/derive-identity.test.ts` -- arbitrary-depth hierarchy tests

## Gotchas

- `fromNsec()` applies an HMAC intermediate to derive the tree root: it is not the same as using the raw nsec bytes directly. The Rust counterpart (`heartwood-core::from_nsec_bytes()`) applies the same step; both sides must produce identical output.
- Purposes must be non-empty, not whitespace-only, free of NUL, and at most 255 UTF-8 bytes. `validateProofPurpose` additionally rejects `|` and control characters (C0 and DEL), to keep the pipe-delimited linkage-proof attestation format unambiguous. Persona names reject `|` and control characters too. All validation failures throw `NsecTreeError`.
- Persona derivation is two-level: `derivePersona()` derives from the tree root, then persona children derive from the persona. Recovering a persona requires the tree root, not just the persona key.
- Two proof forms: `createBlindProof()` proves that the tree root owns a child, naming the master and child public keys but hiding the purpose and index (the derivation slot); `createFullProof()` also reveals the purpose and index. Neither reveals the root secret. Choose based on privacy requirements.
- `recoverPersonas(root, names?, scanRange?)` defaults `scanRange` to 1 (index 0 only), whereas `recover()` defaults to 20.
- String encodings (bech32) cannot be zeroed in JS: security-sensitive code should use raw byte arrays instead.

## Design spec

- `PROTOCOL.md` -- the canonical, versioned derivation specification with frozen test vectors.
- `RECOVERY.md` -- the canonical typed recovery-word envelope with frozen cross-language vectors.
