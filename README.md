# nsec-tree

> **Alpha:** ForgeSworn Recovery Words v1 is available in
> `1.6.0-alpha.1` for integration testing. Its automated cross-language vectors
> pass, but the full Heartwood hardware recovery ceremony has not run. Use test
> keys and keep an independent backup.

> Deterministic Nostr identity hierarchies. One master secret, unlimited identities.

[![CI](https://github.com/forgesworn/nsec-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/forgesworn/nsec-tree/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nsec-tree.svg)](https://www.npmjs.com/package/nsec-tree)
[![Context7](https://img.shields.io/badge/Context7-indexed-blue)](https://context7.com/forgesworn/nsec-tree)

```
npm install nsec-tree          # the `latest` dist-tag
npm install nsec-tree@alpha    # 1.6.0-alpha.1, needed for `nsec-tree/recovery`
```

`npm install nsec-tree` resolves to the `latest` dist-tag. This repository's
`package.json` is `1.6.0-alpha.1` with `publishConfig.tag` set to `alpha`, so
the alpha does not move `latest`. The last stable release tag here is `v1.5.1`,
which has no `nsec-tree/recovery` subpath: install `nsec-tree@alpha` to use the
recovery words shown below. `deriveRendezvous` landed on `main` after the
`v1.6.0-alpha.1` tag, so it is in neither of those releases.

ESM-only. Zero custom crypto — all primitives from @noble/@scure.

**Discuss:** [NIP-IDENTITY-TREES draft](https://github.com/forgesworn/nip-drafts/blob/main/nips/NIP-IDENTITY-TREES.md) · [FAQ](docs/faq.md) · **Nostr:** [`npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2`](https://njump.me/npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2)

## Why nsec-tree?

NIP-06 standardises mnemonic-based key derivation but is now marked
"unrecommended" in favour of a single nsec, and most clients surface one
primary key regardless. nsec-tree gives you a purpose-tagged identity tree.

- **Unlinkable by default** — no observer can prove two child npubs share a master
- **Self-describing recovery** — 19 typed words carry a 12-word payload plus the exact derivation and a public fingerprint
- **Purpose-tagged** — human-readable derivation (`"social"`, `"commerce"`, `"trott:rider"`)
- **Composable hierarchies** — model trees like `work -> company:a -> signing`

Children are ordinary Nostr keypairs. Clients that do not understand linkage
proofs will treat them as separate identities.

This is not just "multiple accounts from one seed". You can derive structured
subtrees for personas, organisations, applications, environments, and rotated
replacement keys:

- `personal -> social -> main`
- `personal -> social -> alt`
- `work -> company:a -> payroll`
- `work -> company:b -> ops`
- `work -> company:b -> ops -> emergency`

---

## Quick start

The mnemonic below is the public BIP-39 test vector. Never use it for real keys.

### From a mnemonic (greenfield)

```typescript
import { fromMnemonic, derive } from 'nsec-tree'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const social = derive(root, 'social')
const commerce = derive(root, 'commerce')
console.log(social.npub)   // npub1...
console.log(commerce.npub) // npub1... (different, unlinkable)
root.destroy()
```

### From an existing nsec (existing users)

```typescript
import { fromNsec, derive } from 'nsec-tree/core' // no BIP deps

const nsec = process.env.NSEC // your existing bech32 nsec1... key
if (!nsec) throw new Error('set NSEC to an existing nsec1... key')

const root = fromNsec(nsec)
const throwaway = derive(root, 'throwaway', 42)
console.log(throwaway.npub)
root.destroy()
```

### Make self-describing recovery words

Needs `nsec-tree@alpha` (see Install).

```typescript
import { derive } from 'nsec-tree'
import {
  createMnemonicRecoveryWords,
  restoreRecoveryWords,
} from 'nsec-tree/recovery'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const words = createMnemonicRecoveryWords(mnemonic)
// The complete 19-word sequence is not valid bare BIP-39.
const restored = restoreRecoveryWords(words)
if (restored.type === 'tree-root') {
  console.log(derive(restored.root, 'social').npub)
  restored.root.destroy()
} else {
  // 'raw-nsec': the caller owns the secret key bytes and must zero them
  restored.privateKey.fill(0)
}
```

Raw nsecs use 31 words and explicitly embed either exact-key or nsec-tree-v1
meaning. Bare BIP-39 remains an explicit legacy input. See [`RECOVERY.md`](RECOVERY.md).

### Build a hierarchy

```typescript
import { fromMnemonic, deriveFromIdentity } from 'nsec-tree'
import { derivePersona } from 'nsec-tree/persona'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const work = derivePersona(root, 'work')
const companyA = deriveFromIdentity(work.identity, 'company:a')
const payroll = deriveFromIdentity(companyA, 'payroll')
const companyB = deriveFromIdentity(work.identity, 'company:b')
const ops = deriveFromIdentity(companyB, 'ops')

console.log(work.identity.npub) // master -> work
console.log(payroll.npub)       // master -> work -> company:a -> payroll
console.log(ops.npub)           // master -> work -> company:b -> ops
root.destroy()
```

Each level is deterministic and isolated. Compromising `company:a -> payroll`
does not expose the sibling `company:b -> ops` branch.

### Prove ownership (linkage proofs)

```typescript
import { fromMnemonic, derive } from 'nsec-tree'
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const child = derive(root, 'social')

const proof = createBlindProof(root, child)
// Send proof to verifier...
const valid = verifyProof(proof) // true
root.destroy()
```

### Publish proof to Nostr (NIP-78)

```typescript
import { fromMnemonic, derive } from 'nsec-tree'
import { createBlindProof } from 'nsec-tree/proof'
import { toUnsignedEvent } from 'nsec-tree/event'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const proof = createBlindProof(root, derive(root, 'social'))

const unsigned = toUnsignedEvent(proof)
// Sign with your Nostr library, then publish to relays
root.destroy()
```

---

## API

### `fromMnemonic(mnemonic, passphrase?)`

Create a `TreeRoot` from a BIP-39 mnemonic. Derives the tree root at `m/44'/1237'/727'/0'/0'`. Throws `NsecTreeError` if the mnemonic is not a valid English BIP-39 phrase.

### `fromNsec(nsec)`

Create a `TreeRoot` from a bech32 nsec string or raw 32-byte key. An intermediate HMAC separates the signing key from the derivation key.

### `derive(root, purpose, index?)`

Derive a child `Identity` from a `TreeRoot`. The index defaults to `0`. An `Identity` has these fields:

| Field | Type | Meaning |
|-------|------|---------|
| `nsec` | `string` | NIP-19 bech32 private key |
| `npub` | `string` | NIP-19 bech32 public key |
| `privateKey` | `Uint8Array` | Raw 32-byte secp256k1 scalar |
| `publicKey` | `Uint8Array` | Raw 32-byte x-only (BIP-340) public key |
| `purpose` | `string` | The purpose string used |
| `index` | `number` | The index actually used. It can exceed the requested index in the astronomically unlikely case that the HMAC output is not a valid scalar |

See [Validation rules and errors](#validation-rules-and-errors) for what `purpose` and `index` accept.

### `deriveRendezvous(root, index?)`

Derive the `rendezvous` root child for a supported pairing.
It is deliberately derived from the `TreeRoot`, never an account identity or
persona. Rotate it by incrementing `index`; provision the private half only by
an authenticated private device flow, then call `zeroise()` on the temporary
identity. This helper does not create a pairing link or export a private key.
It is exported from `nsec-tree` and `nsec-tree/core`, together with
`RENDEZVOUS_PURPOSE` (`'rendezvous'`). It was added to `main` after the
`v1.6.0-alpha.1` tag, so the published `1.6.0-alpha.1` and `1.5.1` do not have it.

### `deriveFromIdentity(identity, purpose, index?)`

Derive a child `Identity` from any existing `Identity`, enabling arbitrary-depth
hierarchies like `work -> company:a -> payroll -> hot-wallet`. Exported from
`nsec-tree` only, not from `nsec-tree/core` (see [Subpath exports](#subpath-exports)).

### `recover(root, purposes, scanRange?)`

Scan multiple purposes and indices, returning `Map<string, Identity[]>`. Default scan range: 20 (BIP-44 gap limit). `scanRange` must be an integer from 1 to 10,000, and at most 1,000 purposes are accepted per call.

### `zeroise(identity)`

Zero the private key bytes of a derived identity.

### `derivePersona(root, name, index?)`

Derive a `Persona` (`{ identity, name, index }`) using the purpose `nostr:persona:{name}`. The index defaults to `0`.

### `deriveFromPersona(persona, purpose, index?)`

Derive a sub-identity beneath a persona. Returns an `Identity`.

### `recoverPersonas(root, names?, scanRange?)`

Derive personas for each name at indices `0` to `scanRange - 1`, returning `Map<string, Persona[]>`. `names` defaults to `DEFAULT_PERSONA_NAMES` (`personal`, `bitcoiner`, `work`, `social`, `anonymous`). `scanRange` defaults to `1`, which scans index `0` only; this differs from `recover`, whose default is 20. The same bounds apply as for `recover`: an integer from 1 to 10,000, and at most 1,000 names.

### Recovery words

Available in `nsec-tree@alpha` (`1.6.0-alpha.1`), from `nsec-tree/recovery`.

| Function | Returns |
|----------|---------|
| `createMnemonicRecoveryWords(mnemonic, passphrase?)` | Typed 19-word `string` (for a 12-word mnemonic) wrapping a BIP-39 mnemonic. The passphrase is never included, only a flag and a public fingerprint |
| `createNsecRecoveryWords(nsec, mode)` | Typed `string` for a raw nsec (`string` or 32-byte `Uint8Array`). `mode` is `'raw'` (exact key) or `'tree'` (nsec-tree v1 root) |
| `decodeRecoveryWords(words)` | `DecodedRecoveryWords`: `version`, `kind`, `passphraseRequired`, `fingerprint`, and a secret `payload` (`Uint8Array`) the caller must zero |
| `restoreRecoveryWords(words, passphrase?)` | `RestoredRecovery`, after validating type, checksums, scalar and public fingerprint |
| `recoveryWordsToBytes(words)` | Compact `Uint8Array`, the form used with typed Shamir v3 |
| `recoveryWordsFromBytes(compact)` | The typed word `string` again |

`RecoveryKind` is `'nsec-tree-mnemonic-v1'`, `'raw-nsec-v1'` or `'nsec-tree-nsec-v1'`.
`RestoredRecovery` is one of two shapes, discriminated by `type`:

- `{ type: 'tree-root', source: 'mnemonic' | 'nsec', version: 1, fingerprint, root: TreeRoot }`
- `{ type: 'raw-nsec', version: 1, fingerprint, npub, privateKey: Uint8Array }`, where the caller must zero `privateKey`

The module also exports `RECOVERY_WORDS_VERSION` (`1`) and `RECOVERY_HEADER_WORDS` (`7`).

### `createBlindProof(root, child)`

BIP-340 Schnorr proof, signed with the tree root secret, that the master owns a child. The proof carries the master and child public keys but omits the purpose and index, so it hides the derivation slot. It does not hide the master public key.

### `createFullProof(root, child)`

Like blind proof, but also reveals the purpose and index.

### `verifyProof(proof)`

Verify a `LinkageProof`. Returns `boolean`; malformed proofs return `false` rather than throwing. A `LinkageProof` is:

| Field | Type | Meaning |
|-------|------|---------|
| `masterPubkey` | `string` | Lowercase hex x-only public key of the tree root (64 chars) |
| `childPubkey` | `string` | Lowercase hex x-only child public key (64 chars) |
| `purpose` | `string?` | Present in full proofs, absent in blind proofs |
| `index` | `number?` | Present in full proofs, absent in blind proofs |
| `attestation` | `string` | The signed attestation message (UTF-8) |
| `signature` | `string` | BIP-340 Schnorr signature, lowercase hex (128 chars) |

### `toUnsignedEvent(proof)`

Convert a `LinkageProof` to an unsigned NIP-78 Kind 30078 Nostr event. The application signs and publishes it.

### `fromEvent(event)`

Extract a `LinkageProof` from a NIP-78 event's tags. Pass the result to `verifyProof()` to check cryptographic validity.

### Validation rules and errors

- **Purpose** (`derive`, `deriveFromIdentity`, `deriveFromPersona`, `recover`): a string that is non-empty, not whitespace-only, contains no NUL character, and is at most 255 UTF-8 bytes.
- **Purpose in a full linkage proof** (`createFullProof`, and `verifyProof` or `toUnsignedEvent` on a full proof): additionally must not contain `|` or control characters (C0 range and DEL), because `|` delimits the attestation fields. Plain derivation is not affected.
- **Persona name** (`derivePersona`, `recoverPersonas`): a non-empty string that is not whitespace-only and contains no `|` or control characters.
- **Index**: an integer from `0` to `4294967295` (`MAX_INDEX`).
- **Errors**: validation failures throw `NsecTreeError`, a subclass of `Error` whose `name` is `'NsecTreeError'`. It is exported from `nsec-tree` and `nsec-tree/core`.

---

## Subpath exports

| Import | What | BIP deps? |
|--------|------|-----------|
| `nsec-tree` | Full API | Yes |
| `nsec-tree/core` | fromNsec, derive, deriveRendezvous, RENDEZVOUS_PURPOSE, recover, zeroise, NsecTreeError, the scan and index constants, and the `TreeRoot` and `Identity` types. Not `deriveFromIdentity` | No |
| `nsec-tree/mnemonic` | fromMnemonic | Yes |
| `nsec-tree/proof` | Linkage proofs | No |
| `nsec-tree/persona` | Persona derivation, two-level hierarchy, recovery | No |
| `nsec-tree/event` | NIP-78 event conversion (toUnsignedEvent, fromEvent) | No |
| `nsec-tree/recovery` | Typed recovery creation, compacting, and restore (`nsec-tree@alpha`) | Yes |
| `nsec-tree/encoding` | NIP-19 bech32 helpers (encodeNsec, decodeNsec, encodeNpub, decodeNpub) | No |

Use `nsec-tree/core` if you only need nsec-based derivation. It avoids pulling in BIP-32/39 dependencies.

`deriveFromIdentity` is not in `nsec-tree/core`. Without BIP deps you can build
the same hierarchy from core: `deriveFromIdentity` simply roots a transient
`TreeRoot` at the parent's private key and derives from it.

```typescript
import { fromNsec, derive } from 'nsec-tree/core'

const nsec = process.env.NSEC // your existing bech32 nsec1... key
if (!nsec) throw new Error('set NSEC to an existing nsec1... key')

const root = fromNsec(nsec)
const work = derive(root, 'work')

// Same result as deriveFromIdentity(work, 'company:a')
const workRoot = fromNsec(work.privateKey) // raw bytes are not zeroed, so `work` stays usable
const companyA = derive(workRoot, 'company:a')
console.log(companyA.npub) // master -> work -> company:a

workRoot.destroy()
root.destroy()
```

`deriveFromPersona` in `nsec-tree/persona` also needs no BIP deps and covers
the persona case in one call.

---

## How it works

- **Tree root** from mnemonic (BIP-32 at `m/44'/1237'/727'/0'/0'`) or nsec (intermediate HMAC)
- **Child keys:** `HMAC-SHA256(tree_root, "nsec-tree\0" || purpose || "\0" || index_be32)`
- **Linkage proofs:** BIP-340 Schnorr signatures over attestation strings
- **Hierarchies:** any derived identity can itself become a subtree root via `deriveFromIdentity(...)`
- See `PROTOCOL.md` for the full derivation spec with test vectors

---

## Personas

A persona is a named Nostr identity derived from your master secret using the
convention `nostr:persona:{name}`. Each persona gets its own keypair — suitable
for a separate kind-0 profile — and is unlinkable to other personas by default.

### Deriving personas

```typescript
import { fromMnemonic } from 'nsec-tree'
import { derivePersona } from 'nsec-tree/persona'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const personal = derivePersona(root, 'personal')
const bitcoiner = derivePersona(root, 'bitcoiner')
const work = derivePersona(root, 'work')

console.log(personal.identity.npub)  // npub1...
console.log(bitcoiner.identity.npub) // npub1... (different, unlinkable)
console.log(work.identity.npub)      // npub1...
root.destroy()
```

### Two-level hierarchy

`deriveFromPersona` creates sub-identities beneath a persona. This is useful
for group signing keys: each group gets an isolated keypair derived from the
persona, not the master.

```typescript
import { fromMnemonic } from 'nsec-tree'
import { derivePersona, deriveFromPersona } from 'nsec-tree/persona'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const bitcoiner = derivePersona(root, 'bitcoiner')

const meetup = deriveFromPersona(bitcoiner, 'canary:group:local-meetup')
const conference = deriveFromPersona(bitcoiner, 'canary:group:btcpp-2026')
console.log(meetup.npub, conference.npub)
root.destroy()
```

The hierarchy is: **master → persona → group identity**. Compromising a group
key does not expose the persona key, and compromising a persona does not expose
the master.

### Arbitrary-depth hierarchy

`deriveFromPersona(...)` is just a convenience helper. The more general
`deriveFromIdentity(...)` API lets you keep branching as deep as you need.

```typescript
import { fromMnemonic, deriveFromIdentity } from 'nsec-tree'
import { derivePersona } from 'nsec-tree/persona'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const work = derivePersona(root, 'work')

const companyA = deriveFromIdentity(work.identity, 'company:a')
const payroll = deriveFromIdentity(companyA, 'payroll')
const hotWallet = deriveFromIdentity(payroll, 'hot-wallet')

const companyB = deriveFromIdentity(work.identity, 'company:b')
const ops = deriveFromIdentity(companyB, 'ops')
console.log(hotWallet.npub, ops.npub)
root.destroy()
```

That gives you paths like:

- `master -> work -> company:a -> payroll -> hot-wallet`
- `master -> work -> company:b -> ops`

This is where nsec-tree becomes more than a "multi-account" library. It lets
you model real operational structure directly in deterministic keys: people,
teams, customers, devices, environments, or services. One backup recreates the
entire tree.

### Recovery

`recoverPersonas(root, names?, scanRange?)` re-derives personas from a tree
root by scanning a list of known names. When `names` is omitted it uses
`DEFAULT_PERSONA_NAMES`: `personal`, `bitcoiner`, `work`, `social`, `anonymous`.
`scanRange` defaults to `1` (index `0` only); pass a larger value to scan
rotated indices as well.

```typescript
import { fromMnemonic } from 'nsec-tree'
import { recoverPersonas, DEFAULT_PERSONA_NAMES } from 'nsec-tree/persona'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const defaults = recoverPersonas(root) // default names, index 0 only
const recovered = recoverPersonas(root, DEFAULT_PERSONA_NAMES, 2) // indices 0 and 1

for (const [name, personas] of recovered) {
  console.log(`${name}: ${personas.length} indices scanned`)
}
console.log(defaults.size)
root.destroy()
```

Recovery is deterministic: the same mnemonic always produces the same personas.
You only need to know (or conventionalise) the persona names to scan.

The same principle applies to deeper trees: recovery is easy when branch names
and rotation conventions are stable. The more hierarchy you use, the more
important naming discipline becomes.

### Rotation

If a persona is compromised, derive it at a higher index. A blind linkage proof
then shows continuity (the new persona is controlled by the same master)
without revealing which derivation slot was used. The proof does name the
master and child public keys.

```typescript
import { fromMnemonic } from 'nsec-tree'
import { derivePersona } from 'nsec-tree/persona'
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(mnemonic)
const bitcoinerV0 = derivePersona(root, 'bitcoiner', 0) // compromised
const bitcoinerV1 = derivePersona(root, 'bitcoiner', 1) // replacement

const proof = createBlindProof(root, bitcoinerV1.identity)
console.log(verifyProof(proof), bitcoinerV0.identity.npub) // true: same master, new identity
root.destroy()
```

### Ecosystem integration

> For internal architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

nsec-tree personas are designed to compose with other libraries:

- **canary-kit** — `deriveFromPersona(persona, 'canary:group:...')` produces
  the group signing key that canary-kit uses for encrypted location beacons,
  duress alerts, and liveness checks.
- **spoken-token** — bind a spoken verification token to a persona's public key
  for identity confirmation over voice calls.
- **[heartwood](https://github.com/forgesworn/heartwood)** — hardware signing
  appliance that implements nsec-tree in Rust on a Pi Zero 2 W, serving NIP-46
  remote signing over Tor.
- **[bark](https://github.com/forgesworn/bark)** — browser extension that
  connects to heartwood (or any NIP-46 bunker) for NIP-07 signing with
  per-persona identity selection.

### Security model

Compromise at different levels has different blast radii:

| Compromised | Impact | Mitigation |
|-------------|--------|------------|
| Group key | One group identity exposed | Rotate the group key (new purpose or index) |
| Persona key | All group keys under that persona derivable | Rotate the persona (increment index), issue linkage proof |
| Master secret | All personas and group keys derivable | Rotate the mnemonic, migrate all identities |

The two-level hierarchy ensures that a group key compromise does not escalate to
the persona, and a persona compromise does not escalate to the master.

---

## Examples

Runnable examples in the [`examples/`](examples/) directory:

| Example | What it shows |
|---------|---------------|
| [basic-derivation.ts](examples/basic-derivation.ts) | Derive social + commerce identities |
| [existing-nsec.ts](examples/existing-nsec.ts) | Use an existing nsec, no mnemonic needed |
| [recovery.ts](examples/recovery.ts) | Recover all identities from a mnemonic |
| [linkage-proofs.ts](examples/linkage-proofs.ts) | Blind and full ownership proofs |
| [bot-fleet.ts](examples/bot-fleet.ts) | 10 bots from one seed |
| [nostr-event-signing.ts](examples/nostr-event-signing.ts) | Sign a kind-1 event with nostr-tools |
| [nip78-event.ts](examples/nip78-event.ts) | NIP-78 round-trip — `toUnsignedEvent` / `fromEvent` |
| [persona.ts](examples/persona.ts) | Persona derivation, deep hierarchies, rotation, recovery |

Run any example: `npx tsx examples/<name>.ts`

## Further reading

- [FAQ](docs/faq.md) — common questions and objections
- [Comparison](docs/comparison.md) — nsec-tree vs NIP-06, NIP-26, linked subkeys
- [NIP-IDENTITY-TREES](https://github.com/forgesworn/nip-drafts/blob/main/nips/NIP-IDENTITY-TREES.md) — formal NIP specification (published in forgesworn/nip-drafts)
- [PROTOCOL.md](PROTOCOL.md) — full derivation spec with test vectors

---

## Security

- **Zero custom crypto** — HMAC-SHA256 (RFC 2104), BIP-32, BIP-340 Schnorr. All from @noble/@scure.
- **Unlinkable by default** — selective disclosure only via linkage proofs
- **Zeroisation** — call `root.destroy()` and `zeroise(identity)` when done. `FinalizationRegistry` provides best-effort cleanup if you forget.
- **Master compromise** — if the master secret leaks, all child keys are derivable. Protect it with the same rigour as any nsec.
- See `PROTOCOL.md` for the full threat model

---

## Part of the ForgeSworn Toolkit

[ForgeSworn](https://forgesworn.dev) builds open-source cryptographic identity, payments, and coordination tools for Nostr.

| Library | What it does |
|---------|-------------|
| [nsec-tree](https://github.com/forgesworn/nsec-tree) | Deterministic sub-identity derivation |
| [ring-sig](https://github.com/forgesworn/ring-sig) | SAG/LSAG ring signatures on secp256k1 |
| [range-proof](https://github.com/forgesworn/range-proof) | Pedersen commitment range proofs |
| [canary-kit](https://github.com/forgesworn/canary-kit) | Coercion-resistant spoken verification |
| [spoken-token](https://github.com/forgesworn/spoken-token) | Human-speakable verification tokens |
| [toll-booth](https://github.com/forgesworn/toll-booth) | L402 payment middleware |
| [geohash-kit](https://github.com/forgesworn/geohash-kit) | Geohash toolkit with polygon coverage |
| [nostr-attestations](https://github.com/forgesworn/nostr-attestations) | NIP-VA verifiable attestations |
| [dominion](https://github.com/forgesworn/dominion) | Epoch-based encrypted access control |
| [nostr-veil](https://github.com/forgesworn/nostr-veil) | Privacy-preserving Web of Trust |

## Licence

MIT

---

If you find nsec-tree useful, consider supporting development:

- **GitHub Sponsors:** [TheCryptoDonkey](https://github.com/sponsors/TheCryptoDonkey)
- **Lightning:** `profusemeat89@walletofsatoshi.com`
- **Nostr zaps:** `npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2`
