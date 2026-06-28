# nsec-tree

> Deterministic Nostr identity hierarchies. One master secret, unlimited identities.

[![CI](https://github.com/forgesworn/nsec-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/forgesworn/nsec-tree/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nsec-tree.svg)](https://www.npmjs.com/package/nsec-tree)
[![Context7](https://img.shields.io/badge/Context7-indexed-blue)](https://context7.com/forgesworn/nsec-tree)

```
npm install nsec-tree
```

ESM-only. Zero custom crypto — all primitives from @noble/@scure.

**Discuss:** [NIP-IDENTITY-TREES draft](https://github.com/forgesworn/nip-drafts/blob/main/nips/NIP-IDENTITY-TREES.md) · [FAQ](docs/faq.md) · **Nostr:** [`npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2`](https://njump.me/npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2)

## Why nsec-tree?

NIP-06 standardises mnemonic-based key derivation but is now marked
"unrecommended" in favour of a single nsec, and most clients surface one
primary key regardless. nsec-tree gives you a purpose-tagged identity tree.

- **Unlinkable by default** — no observer can prove two child npubs share a master
- **Recoverable** — 12 words recreate your entire identity tree
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

### Build a hierarchy

```typescript
import { fromMnemonic, deriveFromIdentity } from 'nsec-tree'
import { derivePersona } from 'nsec-tree/persona'

const root = fromMnemonic('abandon abandon ... about')
const work = derivePersona(root, 'work')
const companyA = deriveFromIdentity(work.identity, 'company:a')
const payroll = deriveFromIdentity(companyA, 'payroll')
const companyB = deriveFromIdentity(work.identity, 'company:b')
const ops = deriveFromIdentity(companyB, 'ops')

console.log(work.identity.npub) // master -> work
console.log(payroll.npub)       // master -> work -> company:a -> payroll
console.log(ops.npub)           // master -> work -> company:b -> ops
```

Each level is deterministic and isolated. Compromising `company:a -> payroll`
does not expose the sibling `company:b -> ops` branch.

### Prove ownership (linkage proofs)

```typescript
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const proof = createBlindProof(root, child)
// Send proof to verifier...
const valid = verifyProof(proof) // true
```

### Publish proof to Nostr (NIP-78)

```typescript
import { toUnsignedEvent } from 'nsec-tree/event'

const unsigned = toUnsignedEvent(proof)
// Sign with your Nostr library, then publish to relays
```

---

## API

### `fromMnemonic(mnemonic, passphrase?)`

Create a `TreeRoot` from a BIP-39 mnemonic. Derives the tree root at `m/44'/1237'/727'/0'/0'`.

### `fromNsec(nsec)`

Create a `TreeRoot` from a bech32 nsec string or raw 32-byte key. An intermediate HMAC separates the signing key from the derivation key.

### `derive(root, purpose, index?)`

Derive a child `Identity` from a `TreeRoot`. Returns `{ nsec, npub, privateKey, publicKey, purpose, index }`. The index defaults to `0`.

### `deriveFromIdentity(identity, purpose, index?)`

Derive a child `Identity` from any existing `Identity`, enabling arbitrary-depth
hierarchies like `work -> company:a -> payroll -> hot-wallet`.

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

### `toUnsignedEvent(proof)`

Convert a `LinkageProof` to an unsigned NIP-78 Kind 30078 Nostr event. The application signs and publishes it.

### `fromEvent(event)`

Extract a `LinkageProof` from a NIP-78 event's tags. Pass the result to `verifyProof()` to check cryptographic validity.

---

## Subpath exports

| Import | What | BIP deps? |
|--------|------|-----------|
| `nsec-tree` | Full API | Yes |
| `nsec-tree/core` | fromNsec, derive, recover, zeroise | No |
| `nsec-tree/mnemonic` | fromMnemonic | Yes |
| `nsec-tree/proof` | Linkage proofs | No |
| `nsec-tree/persona` | Persona derivation, two-level hierarchy, recovery | No |
| `nsec-tree/event` | NIP-78 event conversion (toUnsignedEvent, fromEvent) | No |
| `nsec-tree/encoding` | NIP-19 bech32 helpers (encodeNsec, decodeNsec, encodeNpub, decodeNpub) | No |

Use `nsec-tree/core` if you only need nsec-based derivation — it avoids pulling in BIP-32/39 dependencies.

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

const root = fromMnemonic('abandon abandon ... about')
const personal = derivePersona(root, 'personal')
const bitcoiner = derivePersona(root, 'bitcoiner')
const work = derivePersona(root, 'work')

console.log(personal.identity.npub)  // npub1...
console.log(bitcoiner.identity.npub) // npub1... (different, unlinkable)
```

### Two-level hierarchy

`deriveFromPersona` creates sub-identities beneath a persona. This is useful
for group signing keys — each group gets an isolated keypair derived from the
persona, not the master.

```typescript
import { deriveFromPersona } from 'nsec-tree/persona'

const meetup = deriveFromPersona(bitcoiner, 'canary:group:local-meetup')
const conference = deriveFromPersona(bitcoiner, 'canary:group:btcpp-2026')
```

The hierarchy is: **master → persona → group identity**. Compromising a group
key does not expose the persona key, and compromising a persona does not expose
the master.

### Arbitrary-depth hierarchy

`deriveFromPersona(...)` is just a convenience helper. The more general
`deriveFromIdentity(...)` API lets you keep branching as deep as you need.

```typescript
import { deriveFromIdentity } from 'nsec-tree'

const companyA = deriveFromIdentity(work.identity, 'company:a')
const payroll = deriveFromIdentity(companyA, 'payroll')
const hotWallet = deriveFromIdentity(payroll, 'hot-wallet')

const companyB = deriveFromIdentity(work.identity, 'company:b')
const ops = deriveFromIdentity(companyB, 'ops')
```

That gives you paths like:

- `master -> work -> company:a -> payroll -> hot-wallet`
- `master -> work -> company:b -> ops`

This is where nsec-tree becomes more than a "multi-account" library. It lets
you model real operational structure directly in deterministic keys: people,
teams, customers, devices, environments, or services. One backup recreates the
entire tree.

### Recovery

`recoverPersonas` re-derives all personas from a mnemonic by scanning a list of
known names. When no names are provided it uses `DEFAULT_PERSONA_NAMES`:
`personal`, `bitcoiner`, `work`, `social`, `anonymous`.

```typescript
import { recoverPersonas, DEFAULT_PERSONA_NAMES } from 'nsec-tree/persona'

const root = fromMnemonic('abandon abandon ... about')
const recovered = recoverPersonas(root, DEFAULT_PERSONA_NAMES, 2)

for (const [name, personas] of recovered) {
  console.log(`${name}: ${personas.length} indices scanned`)
}
```

Recovery is deterministic — the same mnemonic always produces the same personas.
You only need to know (or conventionalise) the persona names to scan.

The same principle applies to deeper trees: recovery is easy when branch names
and rotation conventions are stable. The more hierarchy you use, the more
important naming discipline becomes.

### Rotation

If a persona is compromised, derive it at a higher index:

```typescript
const bitcoinerV0 = derivePersona(root, 'bitcoiner', 0) // compromised
const bitcoinerV1 = derivePersona(root, 'bitcoiner', 1) // replacement
```

Use a blind linkage proof to prove continuity — the new persona is controlled by
the same master — without revealing which derivation slot was used:

```typescript
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const proof = createBlindProof(root, bitcoinerV1.identity)
verifyProof(proof) // true — same master, new identity
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
- **Lightning:** `thedonkey@strike.me`
- **Nostr zaps:** `npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2`
