NIP-XXXX
========

Purpose-Tagged Identity Derivation

`draft` `optional`

## Motivation

Nostr users who want to maintain separate identities — one for social posting, one for commerce, one for a specific application — must today manage multiple independent nsecs. There is no standard way to derive these from a single secret, so users either reuse one identity (losing privacy) or accumulate a growing collection of unrelated keys with no recovery path if any are lost.

NIP-06 solves a related problem: deterministic derivation of a single Nostr identity from a BIP-39 mnemonic. This NIP is complementary, not competing. It extends the same mnemonic path — using a different account index to avoid collision — and adds a second entry point for users who already have an nsec and do not use a mnemonic wallet. Both entry points produce a **tree root** from which an unlimited number of child keypairs can be derived deterministically.

Each child is scoped to a human-readable **purpose string** and a numeric index. A `"social"` child and a `"commerce"` child are entirely independent secp256k1 keypairs; an observer cannot tell they share a root. A user who loses access to their wallet can recover all children by re-running derivation over their known purpose strings. Optional **linkage proofs** allow selective, verifiable disclosure that a child belongs to a particular master identity, without revealing other children.

**This NIP requires no relay changes, no client changes, and no new event kinds. Child keys are ordinary Nostr keypairs.** Any existing Nostr client can use a child identity without knowing it was derived. The derivation happens entirely client-side, using only HMAC-SHA256 and — optionally — standard BIP-32 key derivation.

## Notation

| Symbol | Meaning |
|--------|---------|
| `HMAC-SHA256(key, msg)` | RFC 2104 HMAC with SHA-256 |
| `utf8(s)` | UTF-8 encoding of string `s` |
| `uint32_be(n)` | 4-byte unsigned big-endian integer |
| `\|\|` | Byte concatenation |
| `0x00` | Single null byte |
| `secp256k1_x_only(sk)` | BIP-340 x-only public key from private key `sk` |

## Tree Root Derivation

Two entry points produce a 32-byte **tree root secret**. The tree root is a valid secp256k1 private key; its x-only public key (BIP-340) is the **master pubkey**, used in linkage proofs and recovery.

The two paths intentionally produce different tree roots from the same underlying key material. Users must choose one entry point and use it consistently.

### Mnemonic Path

```
BIP-39 mnemonic (with optional passphrase)
  -> BIP-32 seed
  -> derive child at m/44'/1237'/727'/0'/0'  (all five levels hardened)
  -> 32-byte private key = tree_root
```

The derivation path `m/44'/1237'/727'/0'/0'` uses NIP-06's coin type (`1237'`) but a different account index (`727'`) to avoid collision with NIP-06's own identity at `0'`. All levels are hardened because the tree root is used only as an HMAC secret and linkage proof signer — never for extended public key derivation.

```
master_pubkey = secp256k1_x_only(tree_root)
```

### Nsec Path

The nsec is not used directly as the HMAC key. An intermediate HMAC creates one-way separation between the signing key and the derivation key, following the HKDF-Extract pattern:

```
tree_root = HMAC-SHA256(key = nsec_bytes, msg = utf8("nsec-tree-root"))
```

Where `nsec_bytes` is the raw 32-byte private key decoded from the bech32 `nsec`, and `"nsec-tree-root"` is the fixed 14-byte ASCII label (`6e7365632d747265652d726f6f74`).

```
master_pubkey = secp256k1_x_only(tree_root)
```

This ensures the tree root cannot be reversed to recover the nsec, and that compromising a child key does not expose the nsec. The nsec remains usable as a standalone signing key without dual-purpose risk.

## Child Key Derivation

All child keys are derived from the tree root via HMAC-SHA256:

```
message      = utf8("nsec-tree") || 0x00 || utf8(purpose) || 0x00 || uint32_be(index)
child_privkey = HMAC-SHA256(key = tree_root, msg = message)
child_pubkey  = secp256k1_x_only(child_privkey)
```

The HMAC message is constructed by concatenating:

| Component | Encoding | Bytes |
|-----------|----------|-------|
| Domain prefix | `utf8("nsec-tree")` | 9 bytes: `6e7365632d74726565` |
| Separator | `0x00` | 1 byte |
| Purpose | `utf8(purpose)` | Variable |
| Separator | `0x00` | 1 byte |
| Index | `uint32_be(index)` | 4 bytes, big-endian |

The null byte separators prevent concatenation ambiguity between purpose strings and indices.

### Curve Order Handling

HMAC-SHA256 output is 256 bits. If the output, interpreted as an unsigned integer, is greater than or equal to the secp256k1 curve order `n`, it is not a valid private key (probability ≈ 3.7×10⁻³⁹). In this case the implementation MUST increment the index by one and retry. The returned index reflects the **actual index used**, not the originally requested index.

```
current_index = requested_index
while current_index <= 0xFFFFFFFF:
    msg       = utf8("nsec-tree") || 0x00 || utf8(purpose) || 0x00 || uint32_be(current_index)
    candidate = HMAC-SHA256(key = tree_root, msg = msg)
    if candidate < n:
        return (candidate, current_index)
    current_index += 1
error("index overflow")
```

If incrementing would exceed `0xFFFFFFFF`, the derivation MUST fail. In practice this is impossible.

## Purpose Strings

Purpose strings MUST satisfy all of the following:

1. Non-empty — minimum 1 byte when UTF-8 encoded
2. Maximum 255 bytes when UTF-8 encoded
3. No embedded null bytes (`0x00`)
4. At least one non-whitespace character
5. Case-sensitive, byte-exact — `"Social"` and `"social"` are different purposes

Recommended format: lowercase, colon-namespaced (e.g. `"social"`, `"commerce"`, `"trott:rider"`, `"402:api:v2:prod"`). The colon convention lets applications claim namespaces without a central registry.

## Linkage Proofs

Linkage proofs allow the tree root owner to prove that a child identity belongs to them. Two types exist.

### Blind Attestation

Proves ownership without revealing the derivation slot (purpose or index):

```
attestation = "nsec-tree:own:" || hex(master_pub) || ":" || hex(child_pub)
signature   = schnorr_sign(utf8(attestation), tree_root)
```

### Full Attestation

Proves ownership and reveals the derivation slot:

```
attestation = "nsec-tree:link:" || hex(master_pub) || ":" || hex(child_pub) || ":" || purpose || ":" || decimal(index)
signature   = schnorr_sign(utf8(attestation), tree_root)
```

In both cases `hex(...)` is lowercase hex (64 characters for an x-only pubkey) and `decimal(index)` is the index in decimal ASCII with no leading zeroes.

### Verification

Reconstruct the canonical attestation string from the proof's fields and compare it to the provided attestation. Then verify the BIP-340 Schnorr signature against the master pubkey:

```
expected = canonical_attestation_from_fields(proof)
if expected != proof.attestation:
    return false
return schnorr_verify(proof.signature, utf8(proof.attestation), master_pub)
```

### Proof Structure (JSON)

| Field | Type | Description |
|-------|------|-------------|
| `masterPubkey` | string | Lowercase hex x-only pubkey (64 chars) |
| `childPubkey` | string | Lowercase hex x-only pubkey (64 chars) |
| `purpose` | string? | Present in full proofs only |
| `index` | number? | Present in full proofs only |
| `attestation` | string | The signed message (UTF-8) |
| `signature` | string | BIP-340 Schnorr signature (lowercase hex, 128 chars) |

## Recovery

Since derivation is deterministic, the same root always produces the same children. To recover all child identities, scan known purpose strings at indices `0` through `N-1`. A gap limit of N=20 is recommended, following BIP-44 convention: stop scanning a purpose once 20 consecutive indices have produced no known activity.

## Compatibility

**NIP-06:** Complementary. nsec-tree uses NIP-06's coin type (`1237'`) at a different account index (`727'`). Both derivations can coexist under the same mnemonic without collision.

**NIP-07 / NIP-46:** Complementary. A signer can hold the tree root and derive child keys on demand, reducing the amount of key material that must be stored or transferred.

**NIP-26:** Unrelated. NIP-26 delegated signing authority using tags embedded in events, requiring relay and client support. nsec-tree operates entirely client-side and produces ordinary keypairs with no protocol-level delegation mechanism.

**Linked subkeys (PR #1810):** Complementary. If adopted, nsec-tree can generate the derived keys that linked subkeys would publicly associate.

## Security Considerations

**Master compromise.** If the tree root leaks, all child keys are derivable. There is no forward secrecy — the tree is fully deterministic. Protect the master secret with the same rigour as any Nostr nsec.

**Unlinkability.** Without a linkage proof, no observer can determine whether two child keys share a root. The derivation is entirely private; purpose strings, indices, and the tree root are HMAC inputs, never exposed in outputs.

**One-way derivation.** Child keys cannot be reversed to recover the tree root. The tree root cannot be reversed to recover the nsec or mnemonic. Each derivation layer is a one-way HMAC-SHA256 operation.

**Relay correlation.** nsec-tree provides cryptographic unlinkability. Network-level unlinkability (IP addresses, timing, relay sets) is an operational concern outside the scope of this NIP.

**Zeroisation.** Implementations SHOULD zero secret material after use. In garbage-collected languages, string encodings (bech32 nsec) cannot be reliably zeroed; security-sensitive code should work with raw byte arrays.

**No custom cryptography.** All primitives are standard: HMAC-SHA256 (RFC 2104), BIP-32 key derivation, BIP-340 Schnorr signatures.

## Test Vectors

All conformant implementations MUST produce identical outputs for these inputs.

### Vector 1 — nsec path, purpose "social", index 0

**Input:**

```
nsec_bytes:  0101010101010101010101010101010101010101010101010101010101010101
purpose:     "social"
index:       0
```

**Tree root derivation:**

```
tree_root:   8d2db9ce9548534e7ae924d05e311355e3a12744214c88e65b39fa2bf2df6d6f
master_pub:  8c03e047ae60c01e942a8337e71d17e3517fcc63ee6ceff8173bbd23fabe649d
```

**Child derivation:**

```
message:      6e7365632d7472656500736f6369616c0000000000  (21 bytes)
child_priv:   98e98b476eab3c2bcb5020e4a679a41b74eebfb30a07944c4361c906501265e7
child_pub:    cdc4cd2a01ba1b8afd3299b66c38d13043a19acb687c334f0527cffaf464b372
actual_index: 0
```

### Vector 4 — mnemonic path, purpose "social", index 0

**Input:**

```
mnemonic:    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
passphrase:  (none)
purpose:     "social"
index:       0
```

**Tree root derivation** (BIP-32 path `m/44'/1237'/727'/0'/0'`):

```
tree_root:   cc92d213b5eccd19eb85c12c2cf6fd168f27c2cc347c51a7c4c62ac67795fc65
master_pub:  3eb14b67cc942c5388e03570b68d0887d40ff34af234662344e6c72a6298d656
```

**Child derivation:**

```
child_priv:   f0e7c85f394df83212e108e60a7e226045742aa6d967ea1cfddf27ae65ac6ac8
child_pub:    1a4e31045ee7be1fc736954ffe7ea48fffc784865452a79545a027d0e712fc97
actual_index: 0
```

## Reference Implementation

```
https://github.com/forgesworn/nsec-tree
```

TypeScript, ESM-only, zero custom cryptography. All primitives from `@noble/hashes`, `@noble/curves`, and `@scure/bip32`/`@scure/bip39`.
