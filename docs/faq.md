# Frequently Asked Questions

### "NIP-26 tried this and failed"

NIP-26 required every relay to validate delegation tags and every client to parse and display them differently. nsec-tree is a client-side key management library — child keys are ordinary Nostr keypairs. No relay changes, no client changes, no new event kinds. Relays and clients that have never heard of nsec-tree will work with derived keys exactly as they work with any other key.

### "NIP-06 already gives you multiple keys"

NIP-06 defines mnemonic-to-key derivation and allows incrementing the account index for additional keys. nsec-tree builds on this foundation (using NIP-06's coin type 1237') but adds three things NIP-06 does not specify: human-readable purpose tags for semantic derivation, a standardised recovery scanning mechanism, and optional BIP-340 linkage proofs for selective disclosure. They are complementary.

### "This adds key management complexity"

It removes it. Today, users who want separate identities manage N independent nsecs with N separate backups. nsec-tree: one mnemonic, unlimited identities, one backup. The complexity moves from the user (remembering which nsec goes where) to the library (deterministic derivation).

### "Isn't this just personas or multiple accounts?"

No. Personas are only the shallowest use-case. nsec-tree also supports
arbitrary-depth hierarchies, so you can model paths like `work -> company:a ->
payroll` and `work -> company:b -> ops` from the same master secret. That means
one backup can deterministically recreate not just a handful of identities, but
an entire operational key tree with isolated branches and separate blast radii.

### "Nobody needs multiple identities"

Every user who has a shitposting alt already manages multiple identities manually with separate nsecs. Every bot operator manages keys in spreadsheets or environment variables. The need exists — the tooling doesn't. nsec-tree makes what people already do less error-prone and recoverable.

### "HMAC derivation? Why not BIP-32?"

BIP-32 public derivation has a known weakness: if an attacker obtains the parent extended public key and any single child private key, they can derive the parent private key. This is acceptable for Bitcoin wallets (where xpubs are guarded), but inappropriate for Nostr where child keys sign public events. HMAC-SHA256 derivation is strictly one-way — compromising a child key reveals nothing about the root or any sibling.

### "Linkage proofs are a privacy risk"

Linkage proofs are opt-in and can only be created by the key owner (they require the root secret). No observer can force, forge, or infer a linkage proof. The default state is full unlinkability — two child keys are indistinguishable from two completely independent keys. Proofs exist for the cases where the owner actively wants to demonstrate a connection.

### "Who uses this in production?"

The TROTT protocol (decentralised ride-hailing) uses nsec-tree for per-role rider/driver identities. The L402/toll-booth ecosystem uses it for per-service signing identities across API gateways. Canary Kit uses it for duress-resistant verification hierarchies. These are production systems, not experiments. See https://github.com/forgesworn for the public repositories.

### "Why should I trust your crypto?"

nsec-tree uses zero custom cryptographic primitives. All operations use HMAC-SHA256 from @noble/hashes, BIP-32/39 from @scure/bip32 and @scure/bip39, and BIP-340 Schnorr from @noble/curves — all written by Paul Miller and independently audited. The derivation protocol has a formal specification (PROTOCOL.md) with frozen test vectors that any implementation can verify against.

### "The linked subkeys draft already covers this"

The linked subkeys proposal (PR #1810) addresses a related but different problem: it defines how to publicly link existing keys using kind-0 event tags, which requires client support to interpret. nsec-tree is a key derivation library that works today with every existing client and relay because child keys are standard keypairs. If linked subkeys lands as a NIP, nsec-tree can generate the derived keys that it would link.
