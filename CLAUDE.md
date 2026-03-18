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

## Subpath exports

- `nsec-tree` — full API
- `nsec-tree/core` — no BIP-32/39 deps (fromNsec, derive, recover, zeroise)
- `nsec-tree/mnemonic` — fromMnemonic only
- `nsec-tree/proof` — linkage proofs only

## Design spec

`trott-business/docs/plans/2026-03-18-nsec-tree-design.md`
