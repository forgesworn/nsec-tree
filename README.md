# nsec-tree

Deterministic Nostr sub-identity derivation. One master secret, unlimited identities.

```
npm install nsec-tree
```

ESM-only. Zero custom crypto — all primitives from @noble/@scure.

## Why nsec-tree?

NIP-06 gives you one key from a mnemonic. nsec-tree gives you an identity tree.

- **Unlinkable by default** — no observer can prove two child npubs share a master
- **Recoverable** — 12 words recreate your entire identity tree
- **Purpose-tagged** — human-readable derivation (`"social"`, `"commerce"`, `"trott:rider"`)

---

## Quick start

### From a mnemonic (greenfield)

```typescript
import { fromMnemonic, derive } from 'nsec-tree'

const root = fromMnemonic('abandon abandon ... about')
const social = derive(root, 'social')
const commerce = derive(root, 'commerce')
console.log(social.npub)   // npub1...
console.log(commerce.npub) // npub1... (different, unlinkable)
root.destroy()
```

### From an existing nsec (existing users)

```typescript
import { fromNsec, derive } from 'nsec-tree/core' // no BIP deps

const root = fromNsec('nsec1...')
const throwaway = derive(root, 'throwaway', 42)
```

### Prove ownership (linkage proofs)

```typescript
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const proof = createBlindProof(root, child)
// Send proof to verifier...
const valid = verifyProof(proof) // true
```

---

## API

### `fromMnemonic(mnemonic, passphrase?)`

Create a `TreeRoot` from a BIP-39 mnemonic. Derives the tree root at `m/44'/1237'/727'/0'/0'`.

### `fromNsec(nsec)`

Create a `TreeRoot` from a bech32 nsec string or raw 32-byte key. An intermediate HMAC separates the signing key from the derivation key.

### `derive(root, purpose, index?)`

Derive a child `Identity` from a `TreeRoot`. Returns `{ nsec, npub, privateKey, publicKey, purpose, index }`. The index defaults to `0`.

### `recover(root, purposes, scanRange?)`

Scan multiple purposes and indices, returning `Map<string, Identity[]>`. Default scan range: 20 (BIP-44 gap limit).

### `zeroise(identity)`

Zero the private key bytes of a derived identity.

### `createBlindProof(root, child)`

BIP-340 Schnorr proof that the master owns a child — without revealing the derivation slot.

### `createFullProof(root, child)`

Like blind proof, but also reveals the purpose and index.

### `verifyProof(proof)`

Verify a `LinkageProof`. Returns `boolean`.

---

## Subpath exports

| Import | What | BIP deps? |
|--------|------|-----------|
| `nsec-tree` | Full API | Yes |
| `nsec-tree/core` | fromNsec, derive, recover, zeroise | No |
| `nsec-tree/mnemonic` | fromMnemonic | Yes |
| `nsec-tree/proof` | Linkage proofs | No |

Use `nsec-tree/core` if you only need nsec-based derivation — it avoids pulling in BIP-32/39 dependencies.

---

## How it works

- **Tree root** from mnemonic (BIP-32 at `m/44'/1237'/727'/0'/0'`) or nsec (intermediate HMAC)
- **Child keys:** `HMAC-SHA256(tree_root, "nsec-tree\0" || purpose || "\0" || index_be32)`
- **Linkage proofs:** BIP-340 Schnorr signatures over attestation strings
- See `PROTOCOL.md` for the full derivation spec with test vectors

---

## Security

- **Zero custom crypto** — HMAC-SHA256 (RFC 2104), BIP-32, BIP-340 Schnorr. All from @noble/@scure.
- **Unlinkable by default** — selective disclosure only via linkage proofs
- **Zeroisation** — call `root.destroy()` and `zeroise(identity)` when done. `FinalizationRegistry` provides best-effort cleanup if you forget.
- **Master compromise** — if the master secret leaks, all child keys are derivable. Protect it with the same rigour as any nsec.
- See `PROTOCOL.md` for the full threat model

---

## Licence

MIT
