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

## Pull requests

1. Push your branch to a fork or to `forgesworn/nsec-tree` if you have access
2. Open a PR against `main` with a `type: description` title
3. Wait for CI to go green (vitest + typecheck on Node 22)
4. A maintainer reviews — crypto-touching changes get extra scrutiny
5. On merge, semantic-release publishes a new version automatically

## Architecture

```
src/
  types.ts            — Interfaces, error types, constants, internal WeakMap
  encoding.ts         — NIP-19 bech32 (nsec/npub), hex utilities
  validate.ts         — Purpose string validation (derivation + proof variants)
  derive.ts           — HMAC-SHA256 child key derivation, derive() and zeroise()
  derive-identity.ts  — deriveFromIdentity() for arbitrary-depth hierarchies
  root-nsec.ts        — fromNsec(), createTreeRoot(), FinalizationRegistry
  root-mnemonic.ts    — fromMnemonic() (BIP-32, imports @scure/bip32+bip39)
  recover.ts          — Scan-based identity recovery across purposes × indices
  proof.ts            — BIP-340 Schnorr linkage proofs (blind + full)
  persona.ts          — Named persona derivation, two-level hierarchy, recovery
  event.ts            — NIP-78 Kind 30078 event conversion (toUnsignedEvent, fromEvent)
  index.ts            — Full API re-export
  core.ts             — No-BIP-deps barrel (imports root-nsec, not root-mnemonic)
  mnemonic.ts         — fromMnemonic-only barrel
  persona-barrel.ts   — persona subpath barrel
  encoding-barrel.ts  — encoding subpath barrel
  event-barrel.ts     — event subpath barrel
```

**Key constraint:** `core.ts` must never import `root-mnemonic.ts` — this keeps BIP-32/39 dependencies out of the `nsec-tree/core` subpath export.

## Conventions

- **British English** — colour, initialise, behaviour, licence, zeroise
- **No Co-Authored-By lines** in commits
- **Frozen test vectors** in `test/vectors.test.ts` must never be modified — they are canonical
- **Surgical changes** — no drive-by refactoring. Fix what you came to fix.

## Testing

Tests live in `test/`. Vitest is the test runner. All crypto operations use `@noble/curves` and `@noble/hashes` — imports require `.js` extensions (e.g. `@noble/hashes/hmac.js`).

168 tests across 13 files. Run the full suite before every commit.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. This is a cryptographic library — every change touching key material, derivation, or proofs gets extra scrutiny.
