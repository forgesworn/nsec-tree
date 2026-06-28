# CLAUDE.md — nsec-tree

Deterministic Nostr sub-identity derivation library.

## Build & test

- `npm run build` — compile TypeScript
- `npm test` — run all tests
- `npm run typecheck` — type-check without emitting

## Conventions

- **British English** everywhere.
- **Git:** `type: description` commits. No Co-Authored-By lines.
- **Branch:** Work on branches, merge to main only when complete.
- **Release:** Manual via `gh release create vX.Y.Z` on main. `release.yml` calls `forgesworn/anvil@v0` which runs the pre-publish gates and publishes to npm via OIDC. No auto-release on push.
- **TDD:** Write failing test, implement, verify, commit.

## Architecture

- `src/types.ts` — all interfaces and error types
- `src/encoding.ts` — NIP-19 bech32 (nsec/npub)
- `src/validate.ts` — purpose string validation
- `src/derive.ts` — HMAC-SHA256 child key derivation
- `src/root-nsec.ts` — TreeRoot creation from nsec
- `src/root-mnemonic.ts` — TreeRoot creation from BIP-39 mnemonic
- `src/recover.ts` — scan-based identity recovery
- `src/proof.ts` — BIP-340 Schnorr linkage proofs
- `src/persona.ts` — named persona derivation, two-level hierarchy
- `src/event.ts` — NIP-78 Kind 30078 event conversion (toUnsignedEvent/fromEvent)

## Subpath exports

- `nsec-tree` — full API
- `nsec-tree/core` — no BIP-32/39 deps (fromNsec, derive, recover, zeroise)
- `nsec-tree/mnemonic` — fromMnemonic only
- `nsec-tree/proof` — linkage proofs only
- `nsec-tree/persona` — persona derivation, two-level hierarchy, recovery
- `nsec-tree/event` — NIP-78 event conversion (toUnsignedEvent, fromEvent, constants)
- `nsec-tree/encoding` — NIP-19 bech32 helpers (encodeNsec, decodeNsec, encodeNpub, decodeNpub)

## Gotchas

- **`fromNsec()` applies an HMAC intermediate** to derive the tree root — it is NOT the same as using the raw nsec bytes directly. The Rust side (`heartwood-core`) uses `from_nsec_bytes()` which does the same HMAC step. These must produce identical output.
- **Purpose strings are validated** per PROTOCOL.md §3: non-empty, ≤255 UTF-8 bytes, no null bytes, not whitespace-only. Case-sensitive, no character-set restriction. Recommended convention: lowercase colon-separated namespaces (e.g. `nostr:persona:forgesworn`, `client:bray`). **Proofs additionally reject `|` and control chars** via `validateProofPurpose` to avoid ambiguity in the pipe-delimited linkage-proof attestation format.
- **`zeroise()` must be called** on `TreeRoot` when done — secrets are held in memory until explicitly cleared. The `secret` field is not exposed in the public API by design.
- **Persona derivation is two-level** — `derivePersona()` derives from the tree root, then persona children derive from the persona. This means recovering a persona requires the tree root, not just the persona key.
- **Linkage proofs come in two forms** — `createBlindProof()` (proves two pubkeys share a root without revealing it) and `createFullProof()` (reveals the derivation path). Choose based on privacy requirements.

## Design spec

`PROTOCOL.md` — the canonical, versioned derivation specification with frozen test vectors.
