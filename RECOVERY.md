# ForgeSworn Recovery Words

`v1` `alpha` `not hardware tested`

> **Alpha warning:** the format and frozen cross-language vectors pass the
> automated suite, but the complete write-down, wipe, and restore ceremony has
> not yet run on Heartwood hardware. Use test keys only and retain an
> independent backup. Do not rely on this alpha for funds or an irreplaceable
> identity.

ForgeSworn recovery words are a typed, versioned wrapper around an English
BIP-39 payload. They solve a distinct problem from BIP-39: the complete word
sequence identifies what the payload contains and which derivation must be
used before any key is returned.

Existing bare BIP-39 phrases remain recoverable through the explicit legacy
`nsec-tree/mnemonic/v1` path. They are never auto-detected by this format and
their derivation remains frozen at `m/44'/1237'/727'/0'/0'`.

## Design lineage and why it matters

ForgeSworn Recovery Words v1 is inspired by Thomas Voegtlin's
[Electrum Seed Version System](https://electrum.readthedocs.io/en/latest/seedphrase.html):
recovery material should identify the version and derivation required to
restore it, rather than relying on wallet-specific guessing. ForgeSworn does
not use Electrum seeds or Electrum's derivation format. It retains canonical
BIP-39 payloads and adds a distinct typed envelope for ForgeSworn recovery
kinds. Electrum's reference mnemonic implementation is
[copyright Thomas Voegtlin](https://github.com/spesmilo/electrum/blob/master/electrum/mnemonic.py).

This distinction is operationally important. The same valid 32 secret bytes
can mean an exact raw nsec or an input to the nsec-tree v1 HMAC derivation; a
valid BIP-39 payload can instead mean mnemonic entropy followed by the frozen
BIP-32 path. Guessing the wrong interpretation does not necessarily produce an
error: it can produce a valid but different npub. The typed kind and version
make the choice deterministic, while the public fingerprint makes a wrong
passphrase or derivation fail before key material is returned.

## Word layout

The first seven words encode a 77-bit header. The remaining words are a
canonical BIP-39 English mnemonic whose entropy is the secret payload.

| Bits | Field |
|---:|---|
| 16 | Magic: `0x4653` (ASCII `FS`) |
| 4 | Recovery-envelope version: `1` |
| 4 | Recovery kind |
| 4 | Flags |
| 32 | Public-key fingerprint |
| 17 | Truncated recovery checksum |

Header bits are read most-significant first and split into seven 11-bit BIP-39
word indices. The seven-word prefix makes every supported complete sequence an
invalid BIP-39 word count, so a generic wallet cannot silently accept it as an
ordinary mnemonic.

### Kinds

| Code | Name | Payload | Meaning |
|---:|---|---|---|
| 1 | `nsec-tree-mnemonic-v1` | 128–256-bit BIP-39 entropy | BIP-39 seed, then BIP-32 `m/44'/1237'/727'/0'/0'` |
| 2 | `raw-nsec-v1` | 32-byte nsec | Restore the exact Nostr signing key |
| 3 | `nsec-tree-nsec-v1` | 32-byte nsec | `HMAC-SHA256(key=nsec, msg="nsec-tree-root")` |

Flag bit 0 means that an external BIP-39 passphrase is required. No passphrase
is stored in the recovery words. All other flag bits MUST be zero.

## Fingerprint and checksum

The fingerprint is the first four bytes of:

```text
SHA256(utf8("ForgeSworn recovery fingerprint v1\0") || x_only_public_key)
```

It detects a wrong passphrase or derivation after recovery. It is an
error-detection fingerprint, not an authentication tag.

The checksum is the first 17 bits of:

```text
SHA256(
  utf8("ForgeSworn recovery words v1\0") ||
  byte(version) || byte(kind) || byte(flags) ||
  fingerprint_4 || payload_entropy
)
```

Envelope decoders MUST validate magic, version, known kind, flags, BIP-39
payload checksum, recovery checksum, and payload length. Before returning key
material, restorers MUST additionally validate secp256k1 scalar validity and
the derived public fingerprint. Unsupported versions and kinds fail closed.

## Frozen vectors

### Mnemonic source

Input BIP-39 mnemonic:

```text
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

ForgeSworn recovery words:

```text
edge obtain doll auto level leave morning abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

### Scalar-one nsec, exact identity

The 32-byte private key is 31 zero bytes followed by `0x01`.

```text
edge obtain lizard frost kitten own grit abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon diesel
```

### Scalar-one nsec, nsec-tree source

```text
edge obtain seed afford today police pyramid abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon diesel
```

The two scalar-one sequences carry identical secret bytes but different typed
interpretations and therefore different public fingerprints.

## Secret handling

Decoded payload bytes are secret material. Implementations must zero them after
derivation or transfer. Text strings cannot be reliably zeroised in JavaScript;
prefer byte arrays inside security-sensitive code and keep string lifetimes
short.

## Shamir shares

New Shamir backups MUST use `@forgesworn/shamir-words`
`splitSecretToWordsV3()` / `reconstructWordsV3()`, not its historical
unversioned v2 words. When the shared bytes are a compact serialisation of this
complete recovery sequence, set `payloadKind` to
`forgesworn-recovery-words-v1`. Strict v3 reconstruction preserves both layers:
the Shamir format, threshold, payload kind, and original-secret fingerprint;
then the recovery kind, public fingerprint, passphrase flag, and derivation
inside the reconstructed payload. The v3 fingerprint rejects individually
valid shares mixed across separate split operations before recovery words are
returned.

Historical Shamir v2 shares remain explicitly decodable as `opaque`; callers
must supply their meaning out of band. They must never be guessed from length.

`recoveryWordsToBytes()` produces that compact serialisation as a one-byte word
count followed by the complete sequence's 11-bit word indices, padded with zero
bits. `recoveryWordsFromBytes()` enforces canonical length/padding and validates
the recovery envelope before returning words. A 19-word sequence occupies 28
bytes; a 31-word sequence occupies 44 bytes.
