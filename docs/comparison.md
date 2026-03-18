# nsec-tree vs existing Nostr key approaches

Different approaches exist for managing multiple Nostr identities. Each solves a different problem, and they are not mutually exclusive. This document compares them honestly.

## Comparison

| Feature | NIP-06 | NIP-26 | Linked subkeys (PR #1810) | nsec-tree |
|---------|--------|--------|--------------------------|-----------|
| Multiple keys from one seed | Yes (account index) | No | No | Yes (purpose + index) |
| Purpose-tagged | No | No | No | Yes |
| Composable hierarchies | No | No | No | Yes |
| Unlinkable by default | N/A (keys are independent) | No (delegation visible) | No (linking is the purpose) | Yes (cryptographic) |
| Selective linkage | No mechanism | N/A | Yes (event tags) | Yes (Schnorr proofs) |
| Recovery scanning | No standard | N/A | No | Yes |
| Relay changes required | No | Yes | No | No |
| Client changes required | No | Yes | Yes | No |
| Status | Active | Effectively abandoned | Draft | Library available |

## NIP-06

NIP-06 is the standard for deriving a Nostr keypair from a BIP-39 mnemonic. It is simple, widely supported, and every wallet that accepts a seed phrase understands it. The account index can be incremented to derive additional keys from the same mnemonic. Its strength is universality — any compliant wallet will produce the same key from the same seed. It does not define purpose tags, recovery scanning, or linkage proofs; incrementing an account index gives you more keys but no semantic structure around them.

## NIP-26

NIP-26 attempted event delegation: a root key could sign a delegation token authorising a child key to post on its behalf. Relays were expected to validate delegation tags, and clients were expected to display delegated posts differently. The proposal was sound in intent but the implementation burden was too high — it required coordinated changes across relays and clients before any user could benefit. Adoption stalled and NIP-26 is now considered effectively abandoned. The lesson was that any solution requiring relay and client changes faces an extremely high coordination barrier.

## Linked subkeys (PR #1810)

The linked subkeys proposal defines a way to publicly associate existing independent keys using kind-0 event tags. The keys are not derived from one another — they are independently created and then linked by mutual reference. This requires client support to interpret the links, but no relay changes. It is still in draft and has not yet been merged as a NIP. It is well suited to cases where a user already has separate keys and wants to declare their relationship publicly; it does not help with key generation, backup, or recovery.

## nsec-tree

nsec-tree is a client-side key derivation library. From one master secret (an nsec or BIP-39 mnemonic), it derives unlimited child keypairs using HMAC-SHA256 with human-readable purpose tags. Those children can themselves become subtree roots, so the model is not just "many accounts" but composable hierarchies such as `work -> company:a -> payroll` or `personal -> social -> alt`. Child keys are ordinary Nostr keypairs — no relay changes, no client changes, no new event kinds required. Derived keys are unlinkable by default; an optional BIP-340 Schnorr proof mechanism allows the owner to selectively demonstrate that two keys share a root, without revealing the root itself. A standardised recovery scanning procedure means identities are not lost if the purpose strings are forgotten. nsec-tree is available on npm and works today with all existing Nostr infrastructure.
