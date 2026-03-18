# CLAUDE.md — nsec-tree

Deterministic Nostr sub-identity derivation library.

## Build & test

- `npm run build` — compile TypeScript
- `npm test` — run all tests
- `npm run typecheck` — type-check without emitting

## Conventions

- **British English** everywhere.
- **Git:** `type: description` commits. No Co-Authored-By lines.
- **Branch:** Work on branches, merge to main only when complete (semantic-release auto-publishes).
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

## Design spec

`trott-business/docs/plans/2026-03-18-nsec-tree-design.md`
