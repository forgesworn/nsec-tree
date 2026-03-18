# Contributing to nsec-tree

## Setup

```bash
git clone git@github.com:forgesworn/nsec-tree.git
cd nsec-tree
npm install
npm run build
npm test
```

Requires Node.js 22+.

## Development workflow

1. Create a branch — never commit directly to main (semantic-release auto-publishes on push to main)
2. Write a failing test first (TDD)
3. Implement the minimal code to pass
4. Run `npm test` and `npm run typecheck`
5. Commit with `type: description` format (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Watch mode |
| `npm run build` | Compile TypeScript |
| `npm run typecheck` | Type-check without emitting |
| `npm run clean` | Remove dist/ |

## Architecture

```
src/
  types.ts         — Interfaces, error types, internal WeakMap
  encoding.ts      — NIP-19 bech32 (nsec/npub)
  validate.ts      — Purpose string validation
  derive.ts        — HMAC-SHA256 child key derivation + public derive()/zeroise()
  root-nsec.ts     — fromNsec(), createTreeRoot(), FinalizationRegistry
  root-mnemonic.ts — fromMnemonic() (BIP-32, imports @scure/bip32+bip39)
  recover.ts       — Scan-based identity recovery
  proof.ts         — BIP-340 Schnorr linkage proofs
  index.ts         — Full API re-export
  core.ts          — No-BIP-deps re-export (imports root-nsec, not root-mnemonic)
  mnemonic.ts      — fromMnemonic-only re-export
```

**Key constraint:** `core.ts` must never import `root-mnemonic.ts` — this keeps BIP-32/39 dependencies out of the `nsec-tree/core` subpath export.

## Conventions

- **British English** — colour, initialise, behaviour, licence, zeroise
- **No Co-Authored-By lines** in commits
- **Frozen test vectors** in `test/vectors.test.ts` must never be modified — they are canonical
- **Surgical changes** — no drive-by refactoring. Fix what you came to fix.

## Testing

Tests live in `test/`. Vitest is the test runner. All crypto operations use `@noble/curves` and `@noble/hashes` — imports require `.js` extensions (e.g. `@noble/hashes/hmac.js`).

71 tests across 10 files. Run the full suite before every commit.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. This is a cryptographic library — every change touching key material, derivation, or proofs gets extra scrutiny.
