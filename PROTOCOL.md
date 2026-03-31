nsec-tree Derivation Protocol
==============================

Deterministic Nostr sub-identity derivation via HMAC-SHA256.

`v1.0` `stable`

## Abstract

nsec-tree derives deterministic Nostr sub-identities from a single master
secret. A tree root is established from either a BIP-39 mnemonic or an existing
nsec, then child keys are derived via HMAC-SHA256 using a human-readable purpose
string and a numeric index. Each child is a fully independent secp256k1 key pair
with its own nsec/npub. Children are unlinkable by default; optional Schnorr
linkage proofs allow selective disclosure of the master-child relationship. This
document is precise enough for independent reimplementation in any language
without reference to the TypeScript source.

## Notation

| Symbol | Meaning |
|--------|---------|
| `HMAC-SHA256(key, msg)` | RFC 2104 HMAC with SHA-256 |
| `utf8(s)` | UTF-8 encoding of string `s` |
| `uint32_be(n)` | 4-byte unsigned big-endian integer |
| `\|\|` | Byte concatenation |
| `0x00` | Single null byte |
| `secp256k1_x_only(sk)` | BIP-340 x-only public key from private key `sk` |

## 1. Tree Root Derivation

Two entry points produce a 32-byte **tree root secret**. The tree root is a
valid secp256k1 private key. Its x-only public key (BIP-340) is the **master
pubkey** — the identity used in linkage proofs and recovery.

The two paths are intentionally distinct: the same underlying key material fed
through the mnemonic path and the nsec path produces different tree roots. Users
must choose one entry point and use it consistently.

### 1.1 Mnemonic Path

```
BIP-39 mnemonic (with optional passphrase)
  -> BIP-32 seed
  -> derive child at m/44'/1237'/727'/0'/0'  (all five levels hardened)
  -> 32-byte private key = tree_root
```

The derivation path `m/44'/1237'/727'/0'/0'` uses:
- `44'` — BIP-44 purpose
- `1237'` — Nostr coin type (NIP-06)
- `727'` — nsec-tree account index (avoids collision with NIP-06's `0'`)
- `0'/0'` — hardened change and address indices

All levels are hardened because the tree root is a leaf key used only as an
HMAC secret and linkage proof signer — never for BIP-32 extended public key
derivation.

The master pubkey is:

```
master_pubkey = secp256k1_x_only(tree_root)
```

### 1.2 nsec Path

The nsec is never used directly as the HMAC key. An intermediate HMAC creates
one-way separation between the signing key and the derivation key, following the
HKDF-Extract / BIP-85 pattern:

```
tree_root = HMAC-SHA256(key = nsec_bytes, msg = utf8("nsec-tree-root"))
```

Where:
- `nsec_bytes` — the raw 32-byte private key (decoded from bech32 nsec or
  provided directly)
- `"nsec-tree-root"` — the fixed ASCII label (14 bytes:
  `6e7365632d747265652d726f6f74`)

The master pubkey is:

```
master_pubkey = secp256k1_x_only(tree_root)
```

This ensures:
- The tree root cannot be reversed to recover the nsec
- Compromising a child key does not reveal the nsec (two HMAC layers)
- The nsec remains usable as a signing key without dual-purpose risk

## 2. Child Key Derivation

All child keys are derived from the tree root via HMAC-SHA256:

```
message = utf8("nsec-tree") || 0x00 || utf8(purpose) || 0x00 || uint32_be(index)
child_privkey = HMAC-SHA256(key = tree_root, msg = message)
child_pubkey  = secp256k1_x_only(child_privkey)
```

### 2.1 Byte Layout

The HMAC message is constructed by concatenating:

| Component | Encoding | Description |
|-----------|----------|-------------|
| Domain prefix | `utf8("nsec-tree")` | 9 bytes: `6e7365632d74726565` |
| Separator | `0x00` | 1 byte |
| Purpose | `utf8(purpose)` | Variable length |
| Separator | `0x00` | 1 byte |
| Index | `uint32_be(index)` | 4 bytes, big-endian |

### 2.2 Worked Example

Purpose `"social"`, index `0`:

```
6e7365632d74726565 00 736f6369616c 00 00000000
|________________| |  |__________| |  |______|
 nsec-tree          \0  social      \0  index=0 (big-endian)
```

Total message: 21 bytes (`6e7365632d7472656500736f6369616c0000000000`).

Purpose `"commerce"`, index `0`:

```
6e7365632d74726565 00 636f6d6d65726365 00 00000000
|________________| |  |______________| |  |______|
 nsec-tree          \0  commerce        \0  index=0 (big-endian)
```

Total message: 23 bytes.

The null byte separators prevent concatenation ambiguity: purpose `"a"` at index
`0` is a different message from purpose `"a\x00"` at any index (which is
rejected by validation), and from any other purpose/index combination.

## 3. Purpose String Rules

Purpose strings MUST satisfy all of the following:

1. **Non-empty** — minimum 1 byte when UTF-8 encoded
2. **Maximum 255 bytes** — when UTF-8 encoded (not characters)
3. **No embedded null bytes** — a `0x00` within the purpose would create
   ambiguous parsing of the derivation message
4. **No whitespace-only strings** — at least one non-whitespace character
5. **Case-sensitive, byte-exact** — `"Social"` and `"social"` are different
   purposes; no normalisation is applied

Recommended format: lowercase, colon-separated namespaces
(e.g. `"social"`, `"commerce"`, `"trott:rider"`, `"402:api:v2:prod"`).

## 4. Curve Order Handling

HMAC-SHA256 output is 256 bits. The secp256k1 curve order `n` is:

```
n = FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
```

This is slightly less than 2^256. If the HMAC output, interpreted as a 256-bit
unsigned integer, is greater than or equal to `n`, it is not a valid secp256k1
private key.

**Behaviour:** If the output at the requested index is invalid, the
implementation MUST increment the index and retry. The returned index reflects
the **actual index used**, not the originally requested index.

```
current_index = requested_index
while current_index <= 0xFFFFFFFF:
    msg = utf8("nsec-tree") || 0x00 || utf8(purpose) || 0x00 || uint32_be(current_index)
    candidate = HMAC-SHA256(key = tree_root, msg = msg)
    if candidate < n:
        return (candidate, current_index)
    current_index += 1
error("index overflow")
```

**Overflow:** If incrementing would exceed 2^32 - 1 (the maximum uint32 index),
the derivation MUST fail with an error. The probability of any single index
being invalid is approximately 3.7 x 10^-39, making this scenario effectively
impossible.

## 5. Linkage Proofs

Linkage proofs allow the tree root owner to prove that a child identity belongs
to them. Two proof types exist:

### 5.1 Blind Attestation

Proves ownership without revealing the derivation slot (purpose/index):

```
attestation = "nsec-tree:own|" || hex(master_xonly_pub) || "|" || hex(child_xonly_pub)
```

### 5.2 Full Attestation

Proves ownership and reveals the derivation slot:

```
attestation = "nsec-tree:link|" || hex(master_xonly_pub) || "|" || hex(child_xonly_pub) || "|" || purpose || "|" || decimal(index)
```

### 5.3 Encoding Rules

- `hex(master_xonly_pub)` — lowercase hexadecimal x-only public key, 64
  characters
- `hex(child_xonly_pub)` — lowercase hexadecimal x-only public key, 64
  characters
- `purpose` — the raw purpose string (UTF-8), as used in derivation
- `decimal(index)` — the index as decimal ASCII, no leading zeroes
  (e.g. `"0"`, `"42"`, `"1000"`)
- The complete attestation string is UTF-8 encoded to bytes

### 5.4 Signing and Verification

The attestation is signed with BIP-340 Schnorr using the tree root secret
(the master identity's private key):

```
signature = schnorr_sign(utf8(attestation), tree_root)
```

Verification:

```
expected_attestation = canonical_attestation_from_fields(proof)
if expected_attestation != proof.attestation:
    return false
valid = schnorr_verify(signature, utf8(attestation), master_xonly_pub)
```

Where `master_xonly_pub` is the 32-byte x-only public key of the tree root.

### 5.5 Proof Structure

A serialised linkage proof contains:

| Field | Type | Description |
|-------|------|-------------|
| `masterPubkey` | string | Lowercase hex x-only pubkey (64 chars) |
| `childPubkey` | string | Lowercase hex x-only pubkey (64 chars) |
| `purpose` | string? | Present in full proofs, absent in blind proofs |
| `index` | number? | Present in full proofs, absent in blind proofs |
| `attestation` | string | The signed message (UTF-8) |
| `signature` | string | BIP-340 Schnorr signature (lowercase hex, 128 chars) |

Proofs are serialised as JSON for exchange between parties.

Verifiers MUST treat the attestation string as canonical. The duplicated JSON
fields are for convenience only and MUST exactly match the canonical
attestation; otherwise the proof is invalid.

## 6. Test Vectors

All vectors are frozen. Any conformant nsec-tree implementation MUST produce
identical outputs for these inputs.

### 6.1 Vector 1 — nsec root, purpose "social", index 0

**Input:**

```
nsec_bytes:  0101010101010101010101010101010101010101010101010101010101010101
purpose:     "social"
index:       0
```

**Tree root derivation** (nsec path):

```
tree_root    = HMAC-SHA256(key = nsec_bytes, msg = utf8("nsec-tree-root"))
             = 8d2db9ce9548534e7ae924d05e311355e3a12744214c88e65b39fa2bf2df6d6f
master_pub   = secp256k1_x_only(tree_root)
             = 8c03e047ae60c01e942a8337e71d17e3517fcc63ee6ceff8173bbd23fabe649d
master_npub  = npub13sp7q3awvrqpa9p2svm7w8ghudghlnrraekwl7qh8w7j8747vjwskvzy2u
```

**Child derivation:**

```
message      = 6e7365632d7472656500736f6369616c0000000000  (21 bytes)
child_priv   = HMAC-SHA256(key = tree_root, msg = message)
             = 98e98b476eab3c2bcb5020e4a679a41b74eebfb30a07944c4361c906501265e7
child_pub    = secp256k1_x_only(child_priv)
             = cdc4cd2a01ba1b8afd3299b66c38d13043a19acb687c334f0527cffaf464b372
child_nsec   = nsec1nr5ck3mw4v7zhj6syrj2v7dyrd6wa0anpgregnzrv8ysv5qjvhnsafv7mx
child_npub   = npub1ehzv62sphgdc4lfjnxmxcwx3xpp6rxktdp7rxnc9yl8l4arykdeqyfhrxy
actual_index = 0
```

### 6.2 Vector 2 — nsec root, purpose "commerce", index 0

**Input:**

```
nsec_bytes:  0101010101010101010101010101010101010101010101010101010101010101
purpose:     "commerce"
index:       0
```

**Tree root:** Same as Vector 1 (same nsec).

**Child derivation:**

```
message      = 6e7365632d7472656500636f6d6d657263650000000000  (23 bytes)
child_priv   = fc62a2ec7f91970c485f9d7453268d1a6a07273ee829cf44c87685f78758f04f
child_pub    = 8441f7e2a73fea0742ccd12858bd5b95ccae385fbcb2856b7d7177880198a663
child_nsec   = nsec1l3329mrljxtscjzln469xf5drf4qwfe7aq5u73xgw6zl0p6c7p8sd6vumk
actual_index = 0
```

### 6.3 Vector 3 — nsec root, purpose "social", index 1

**Input:**

```
nsec_bytes:  0101010101010101010101010101010101010101010101010101010101010101
purpose:     "social"
index:       1
```

**Tree root:** Same as Vector 1 (same nsec).

**Child derivation:**

```
message      = 6e7365632d7472656500736f6369616c0000000001  (21 bytes)
child_priv   = 802a2fd31d25517bd2bb9b7196c377e6cc2f32728b916c2c3ea71ca703767917
child_pub    = aed0bc4ccccdb868156e38cabf3a6acb98f8fa8a4abe0dcc68851d8468a87cd1
child_nsec   = nsec1sq4zl5cay4ghh54mndcedsmhumxz7vnj3wgkctp75uw2wqmk0yts3ny5vz
actual_index = 1
```

### 6.4 Vector 4 — mnemonic root, purpose "social", index 0

**Input:**

```
mnemonic:    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
passphrase:  (none)
purpose:     "social"
index:       0
```

**Tree root derivation** (mnemonic path):

```
BIP-32 path  = m/44'/1237'/727'/0'/0'
tree_root    = cc92d213b5eccd19eb85c12c2cf6fd168f27c2cc347c51a7c4c62ac67795fc65
master_pub   = 3eb14b67cc942c5388e03570b68d0887d40ff34af234662344e6c72a6298d656
master_npub  = npub186c5ke7vjsk98z8qx4ctdrggsl2qlu627g6xvg6yumrj5c5c6etqcfaclx
```

**Child derivation:**

```
child_priv   = f0e7c85f394df83212e108e60a7e226045742aa6d967ea1cfddf27ae65ac6ac8
child_pub    = 1a4e31045ee7be1fc736954ffe7ea48fffc784865452a79545a027d0e712fc97
child_nsec   = nsec17rnusheefhuryyhpprnq5l3zvpzhg24xm9n7588amun6uedvdtyqnpcsm4
actual_index = 0
```

### 6.5 Vector 5 — path independence

The same BIP-39 mnemonic produces a **different** tree root when used via the
mnemonic path vs. the nsec path.

**Mnemonic path** (same as Vector 4):

```
mnemonic     = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
tree_root    = cc92d213b5eccd19eb85c12c2cf6fd168f27c2cc347c51a7c4c62ac67795fc65
master_pub   = 3eb14b67cc942c5388e03570b68d0887d40ff34af234662344e6c72a6298d656
master_npub  = npub186c5ke7vjsk98z8qx4ctdrggsl2qlu627g6xvg6yumrj5c5c6etqcfaclx
```

**nsec path** (NIP-06 key from the same mnemonic, derived at `m/44'/1237'/0'/0/0`):

```
nsec_bytes   = 5f29af3b9676180290e77a4efad265c4c2ff28a5302461f73597fda26bb25731
tree_root    = 3ac534dcff9286225e0a254aade75a991a1f41fcbe719cc7dd899dd833b6e4d6
master_pub   = 4e444e24184d8b303bbbc6a7a4b97b8906ab8e475e2864bd71043d45819612ae
master_npub  = npub1fezyufqcfk9nqwamc6n6fwtm3yr2hrj8tc5xf0t3qs75tqvkz2hq40tnpd
```

The two master pubkeys differ, confirming that mnemonic-path and nsec-path
derivations are independent.

## 7. Security Considerations

### One-way derivation

Child keys cannot be reversed to recover the tree root or the master secret.
The tree root cannot be reversed to recover the nsec (nsec path) or mnemonic
(mnemonic path). Each layer of derivation is a one-way HMAC-SHA256 operation.

### Unlinkable by default

No observer can prove that two child npubs share a master without a linkage
proof. The derivation is entirely private — purpose strings, indices, and the
tree root are HMAC inputs, never exposed in outputs.

### Zeroisation responsibility

Implementations MUST provide a mechanism to zero secret material when it is no
longer needed:

- Tree root secret — zeroed on explicit destroy or when the root goes out of
  scope (best-effort in garbage-collected languages)
- BIP-39 seed and BIP-32 intermediate keys — zeroed immediately after tree root
  extraction
- Child private keys — zeroed via explicit function call

String encodings (bech32 nsec/npub) cannot be zeroed in garbage-collected
languages. Security-sensitive consumers should use raw byte arrays and avoid
retaining string encodings.

### Relay correlation caveat

If two child npubs post similar content at similar times from similar IP
addresses, metadata correlation may reveal they share an operator. This is an
operational security concern, not a cryptographic one. nsec-tree provides
cryptographic unlinkability; network-level unlinkability requires additional
measures (Tor, timing delays, distinct relay sets).

### Master compromise

If the master secret (mnemonic or nsec) is compromised, all child keys are
derivable. There is no forward secrecy — the tree is fully deterministic.
Protect the master secret with the same rigour as any Nostr nsec.

### No custom cryptography

All cryptographic primitives are standard: HMAC-SHA256 (RFC 2104), BIP-32
key derivation, BIP-340 Schnorr signatures. The only novel element is the
derivation context format (the byte string structure), which is deterministic
and fully specified above.

## Reference Implementation

The canonical implementation is the `nsec-tree` npm package:

```
npm install nsec-tree
```

Source: https://github.com/forgesworn/nsec-tree

## Versioning

This document is versioned as `v1.0`. The version covers:
- Tree root derivation (mnemonic path and nsec path)
- Child key derivation (HMAC message format)
- Purpose string validation rules
- Linkage proof attestation formats
- Test vectors

Changes to any of the above require a version bump. Additions (new proof types,
new entry points) that do not alter existing derivation outputs MAY be added
without a version bump.
