# Wrapped Nsec v1 (preview)

An existing, unrelated Nostr key can be **recoverable with a tree root and an
encrypted record**. It is imported, never derived. Its exact nsec and npub
stay the same. Existing derivations, proofs and Recovery Words are unchanged.

This is an alpha preview, not an independently reviewed format. Keep
an independent backup of the imported key while evaluating it with test keys.
Automated interoperability does not establish hardware recovery acceptance.

## API and custody

```ts
import { fromNsec } from 'nsec-tree/core'
import { wrapNsec, unwrapNsec } from 'nsec-tree/wrapped'

const root = fromNsec(masterBytes) // caller still owns masterBytes
try {
  const record = await wrapNsec(root, importedBytes)
  // Retain record separately from the device. Root backup alone cannot restore it.
  const restored = await unwrapNsec(root, record, expectedNpub)
  try { /* install restored.privateKey as a RAW key; check restored.npub */ }
  finally { restored.privateKey.fill(0) }
} finally { root.destroy() }
```

Both functions return promises and require a secure random source (Node 22+ or
a secure browser context). Mutable inputs are consumed/copied synchronously. Destroying
a root prevents new operations; it does not cancel an operation already begun.
Owned plaintext and derived-key byte buffers are wiped in finally blocks.
HKDF and AES-GCM use Noble implementations. JavaScript zeroisation is best
effort and cannot guarantee removal of runtime copies. No private-key strings are created by
this API. Callers must wipe their own input and returned private-key buffers.

Reconstruct the **same kind of root**, including any mnemonic passphrase.
`fromNsec(raw)` applies the existing HMAC intermediate. `fromMnemonic(words)`
uses the existing BIP-32 path. A firmware-stored tree-root secret is already a
root: applying `fromNsec` to it again produces a different wrapping key.

The payload is always a **raw nsec**, never a tree seed/root. Restoring it into
a tree-deriving slot changes the identity. Firmware must install it in raw
(`Bunker`) mode. No derivation purpose, index or linkage proof accompanies it.

## Byte format

The transport string is `nstw1:` followed by canonical unpadded base64url of
exactly 131 bytes (181 ASCII characters total). No whitespace is permitted by
the codec. File transports may strip surrounding whitespace before decoding.
Reject other lengths before allocating or attempting cryptography; reject
unknown versions, suites and kinds without fallback.

| Offset | Length | Meaning |
| --- | --- | --- |
| 0 | 4 | ASCII `NSTW` |
| 4 | 1 | Version `01` |
| 5 | 1 | Suite `01`: HKDF-SHA256 + AES-256-GCM |
| 6 | 1 | Kind `01`: raw secp256k1 private key |
| 7 | 32 | Fresh cryptographically random salt |
| 39 | 12 | Fresh cryptographically random GCM nonce |
| 51 | 64 | Encrypted payload |
| 115 | 16 | GCM authentication tag |

`key = HKDF-SHA256(ikm=tree_root_secret, salt=salt,
info=UTF8("nsec-tree/wrapped-nsec/v1"), length=32)`.
The 51-byte header is authenticated additional data. The plaintext is the
32-byte raw private scalar followed by its 32-byte BIP-340 x-only public key.
Use a 128-bit tag. Never provide a caller-controlled entropy/nonce API.

After authentication, validate the scalar and recompute/compare its public
key before returning any secret. If an expected npub was supplied, compare it
before returning. The outer record contains neither root nor imported npub,
name, derivation path or public association. Filenames and application storage
can still disclose associations; prefer generic filenames.

`test/fixtures/wrapped-nsec-v1.json` contains public test material generated
independently using Node's crypto HKDF/AES-GCM. The Rust reference in
`heartwood/crates/heartwood-core` reads the identical fixture and reproduces
the record. Existing frozen derivation/recovery vectors remain separate.

## Recovery and permissions

Loss of the record cannot be repaired by scanning derivation purposes. Loss
of the master cannot be repaired by the record. Master compromise plus access
to records compromises the imported keys. An imported key does not reveal the
master. Rewrapping or deleting a record cannot revoke copies of an old record
held alongside the old master. No record is uploaded or published by this API.

Treat authorisation over the master and imported key independently. Holding
an encrypted record or having ordinary signing/decryption permission is not
authority to load another identity or export a hardware key. Check the restored
npub against the intended account, preserve forbidden-key checks, and obtain
normal consent before granting any client access to the restored account.

## Ecosystem integration contract

| Component | Intended behaviour / gate |
| --- | --- |
| Signet | Explicit file export and file-check after fresh owner authentication, for locally held imported extras and a verified local mnemonic root. Restore authenticates before persistence; retains `imported: true`. No private profile sync, no automatic recovery claim, no dependant/hardware fallback. |
| Bray | Explicit local SDK/owner CLI operations. Imported identities carry origin/recovery metadata, cannot get a derivation proof, and retain forbidden-key enforcement and zeroisation. No automatic MCP tool granting recovery authority. |
| Heartwood | Reference codec only at this stage. Future firmware operations must wrap a selected local raw-key slot and restore directly to an empty raw-key slot. Physical approval must identify the master, target npub, key kind and destination. Never return plaintext to the host. |
| Sapwood | Future owner ceremony after firmware support: choose both slots, save the encrypted record, read it back and verify the exact target npub before claiming backup. No generic decrypt/export shortcut. |
| Bark | Public metadata/QR consumer. Retain explicit account selection and pairing confirmation; never interpret a wrapped record as pairing authority. |
| Cambium | Retain per-app, per-identity routing and permission checks. Unknown/new identities need normal binding and consent, even after owner recovery. |

Future hardware wrap/restore/check methods need an advertised capability and
strict, bounded arguments; unsupported devices must refuse without falling
back to NIP-44 decrypt. Key decryption, validation and slot writes happen on
the signer. Check record authentication and available storage before any
mutation; interrupted restore must leave either the previous slots or one
complete new slot, never a partial key. Do not overwrite an existing slot or
inherit its permissions. A restore response contains public metadata only.

Hardware implementation, physical wipe/restore, and maintainer review remain
separate gates. No bridge, Bark or Cambium protocol changes are required for
the initial software/file implementation.

## Multi-account recovery and storage

Requirements recorded 16 November 2026. Signet's implementation contract is
[Account collection recovery](https://github.com/forgesworn/signet-app/blob/main/docs/ACCOUNT-COLLECTION-RECOVERY.md).
It packages 1–100 unchanged per-account records inside the existing FSWNENC2
envelope, using a dedicated Signet derivation purpose. This adds no nsec-tree
API, derivation change or new raw-key kind. Library and single-account files
remain compatible. Release evidence is recorded in the consumer repositories.
Direct Bothy Keep upload remains a client-integration handover, not a shipped
storage claim.

An owner with ten unrelated accounts must be able to select those accounts,
create one backup collection and restore selected accounts under the same
recovery root. Ten current records contain 1,810 bytes before collection
metadata and storage-envelope overhead. Labels, npubs and their association
must be protected in the collection's authenticated, encrypted manifest.
Authenticate the inventory and its record hashes so omitted, substituted or
duplicate entries cannot silently become a verified complete backup.

Keep the original nsecs/npubs and imported provenance. Restore must show the
account selection and exact results, refuse overwrites, retain normal app
consent, and report any incomplete operation. Adding or removing an account
creates a new snapshot; do not discard the previous verified snapshot before
the replacement has been fetched and checked. The backup count is independent
of signer capacity: Heartwood currently has eight independent master slots.
Ten-account coverage must not require enlarging that limit or holding all ten
accounts on one board at once.

Storage choices are a downloaded collection, an owner's Bothy Keep with
verified replicas, and Wildbloom's existing replicated or 2-of-4 pool. Use
normal storage admission and the required encrypted outer envelope; do not
claim that a bare `.nstw` file is already a compatible pool payload. A
2-of-4 pool reconstructs ciphertext from any two distinct verified parts,
tolerating two part losses across appropriately independent destinations.
It does not split the recovery root or grant two servers decryption authority.
Wildbloom's padding and receipt increase stored bytes beyond the record total.

Recovery must also preserve the bootstrap information needed to find and read
the collection. Wildbloom's ordinary file flow requires its private signed pool
receipt and a separate random `wbk1_` file key. Its existing-encrypted-file pool
flow instead stores Signet's root-protected FSWNENC2 collection directly,
without adding a file key. Save the private signed receipt independently;
download verified ciphertext and open it in Signet. The receipt/locator must
remain independently retrievable and cannot exist only inside the collection
it locates. Read access must not depend on an imported account still locked
inside the collection.
Root-backed protection and bootstrap discovery require their own documented,
reviewed integration; the existing `wrapNsec` raw-key kind must not be
repurposed for a storage key. Keep an offline recovery export and independent
copies of bootstrap information. No plaintext nsec, recovery root or unprotected
storage key goes to a storage operator. Publication of account associations or
an upload to a server requires the owner's explicit choice.

Before claiming support, recover ten disposable accounts in a fresh client
without the original device or its local database. Verify every original npub
and an offline signature for each selected restored key. Cover missing/corrupt
entries, wrong roots, duplicates, interrupted restore, stale snapshots and
unavailable bootstrap data. Exercise all six surviving pairs in a 2-of-4 pool,
refuse recovery from one part, and verify the requested storage layout by
read-back before claiming protection. Keep independent key backups while the
preview's security and physical acceptance gates remain open.
