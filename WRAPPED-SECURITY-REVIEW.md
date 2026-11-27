# Wrapped-account external security review

Prepared 16 November 2026. External review has not been commissioned or
completed. This brief identifies the review candidates; it is not security
approval. Use public disposable keys and retain their independent backups.

The owner has no spare signer. After confirming verified independent recovery
for every stored identity, the owner separately authorised an app-only preview
installation on the connected T-Display. Installed-byte, partition-table,
identity and offline-signing checks passed; the delivery handover records the
evidence and exact rollback. No wrapped-key recovery was attempted. Heartwood
firmware and Sapwood stay draft pending full recovery acceptance on a separate
disposable board. No reviewer contact or public release is authorised by this
brief; independent review remains pending.

## Recovery claim and scope

An unrelated raw key B is encrypted under A's existing tree-root construction.
Recovery requires **both that same root and the encrypted `.nstw` record**.
B keeps its exact nsec and npub and remains imported. A alone cannot derive B.
The record grants no signing permission, pairing, activation or derivation proof.

Review the format and software custody paths together with the proposed USB
device implementation. Existing derivation and Recovery Words formats are
unchanged. Whole-product audits of unrelated features are outside this scope;
follow dependencies and existing authority/storage helpers where necessary.

## Fixed source candidates

Review these revisions rather than moving branch heads. The first four are
the released software preview/reference; the last two are unreleased drafts.
Material fixes require new candidate revisions and review of the changes.

| Component | Exact source | Entry points |
| --- | --- | --- |
| nsec-tree 1.7.0-alpha.1 | [`494a7f6dc9f6f710a2596cdf7691dbfa78a7f36f`](https://github.com/forgesworn/nsec-tree/tree/494a7f6dc9f6f710a2596cdf7691dbfa78a7f36f) | `WRAPPED-NSEC.md`, `src/wrapped.ts`, root constructors, `test/wrapped.test.ts`, `test/fixtures/wrapped-nsec-v1.json` |
| Heartwood Rust reference | [`80cf4c6fdfe04f532b9843616b12721ac2c8a5ea`](https://github.com/forgesworn/heartwood/tree/80cf4c6fdfe04f532b9843616b12721ac2c8a5ea) | `crates/heartwood-core/src/wrapped.rs`, its root constructors and `tests/wrapped_test.rs`; crate name `nsec-tree-rs` |
| My Signet 0.28.0 | [`b15a010548f23f46e2c4b13a344b5e351bc5f218`](https://github.com/forgesworn/signet-app/tree/b15a010548f23f46e2c4b13a344b5e351bc5f218) | `src/lib/wrapped-persona-backup.ts`, `wrapped-backup-file.ts`, `src/hooks/useIdentity.ts`, `src/components/WrappedKeyBackup.tsx`, `android/app/src/main/java/app/mysignet/WrappedBackupDocument.kt` |
| Bray 3.15.0 | [`2bde4c0afdf0dc66a18439c3fc057fad4344f5a3`](https://github.com/forgesworn/bray/tree/2bde4c0afdf0dc66a18439c3fc057fad4344f5a3) | Identity context and imported provenance, `src/identity/wrapped-files.ts`, `src/cli/commands/identity.ts`, `test/context-wrapped.test.ts`, `test/wrapped-files.test.ts` |
| Heartwood ESP32, draft [#309](https://github.com/forgesworn/heartwood-esp32/pull/309) | [`ef13faf5c683dab317b66d0af3be15613830a2b7`](https://github.com/forgesworn/heartwood-esp32/tree/ef13faf5c683dab317b66d0af3be15613830a2b7) | `common/src/wrapped_nsec.rs`, `wrapped_command.rs`, `firmware/src/wrapped_nsec.rs`, `wrapped_card.rs`, `masters.rs`, RNG helper and dispatch in `main.rs` |
| Sapwood, draft [#200](https://github.com/forgesworn/sapwood/pull/200) | [`cc836d0de67923151b1defdcd9538ca68849f8f8`](https://github.com/forgesworn/sapwood/tree/cc836d0de67923151b1defdcd9538ca68849f8f8) | `src/lib/wrapped-account.ts`, `device.svelte.ts`, `serial.ts`, `src/components/WrappedAccount.svelte` and their tests |

The TypeScript, Rust reference and firmware fixtures must remain identical.
Bark and Cambium add no recovery API in this work. Include their existing
account-selection and app/identity-consent boundaries in integration findings;
a restored slot must not inherit authority from the root or a previous slot.

## Questions for the reviewer

1. Does the HKDF-SHA256/AES-256-GCM envelope correctly authenticate its version,
   suite, kind and header, with fresh salt/nonce generation and strict canonical
   decoding? Verify scalar validity, recomputed x-only public key and expected
   npub checks before any plaintext is returned or stored.
2. Is the same root reconstructed in every implementation, including mnemonic
   passphrases and device modes? Check the raw-nsec HMAC intermediate is applied
   exactly once and already-derived device roots are used directly. Restoring
   B must use raw mode rather than a tree-deriving slot.
3. Can untrusted files, filenames, a compromised browser/USB host, concurrent
   requests or stale responses bypass fresh owner approval, select another
   identity or cause an incorrect verified-backup claim? Review bounded input,
   exact receipts, saved-file binding, cancellation and timeout handling.
4. Can restored identities gain existing app/delegate authority, replace an
   account, evade forbidden-key checks or receive a linkage proof? Review
   Signet's fresh authentication and local-owner restriction, Bray's explicit
   activation/imported provenance, and the device's slot/key/npub checks.
5. Do interrupted storage writes and uncertain acknowledgements preserve the
   original slots and expose either no new slot or one complete raw B? Review
   stale-authority cleanup, field read-back, count publication and reload before
   more commands. At-rest encrypted configurations must refuse an unsealed
   new slot without silently changing protection.
6. What secret material can remain in application buffers, crypto-library
   state, compiler/runtime copies or crash/log output? Assess the concrete
   memory threat and zeroisation limits in JS and Rust, including pinned
   HKDF/HMAC digest state. Review existing audited implementations rather than
   assuming that caller-buffer erasure proves complete erasure.
7. Are the custody and recovery claims accurate? Assess loss of either root
   or record, compromise of both, copied old records that cannot be revoked by
   rewrapping, and metadata linkage through filenames or application storage.

## Existing findings and evidence

The implementation source review reproduced and corrected four defects:
uncertain restore publication without reload, radio-inappropriate entropy
selection, out-of-order saved-file reads and extra fields in successful
receipts. Regressions and remaining limits are mapped in the pinned
[Heartwood review](https://github.com/forgesworn/heartwood-esp32/blob/ef13faf5c683dab317b66d0af3be15613830a2b7/WRAPPED-NSEC-REVIEW.md).
Treat these fixes as review inputs, not independent approval.

The [delivery handover](WRAPPED-PREVIEW-HANDOVER.md) records software release,
interoperability and recipient-install evidence. The draft revisions passed
[Heartwood CI](https://github.com/forgesworn/heartwood-esp32/actions/runs/43823516481)
and [Sapwood CI](https://github.com/forgesworn/sapwood/actions/runs/43823510909).
Heartwood's C6 build was deliberately skipped. Local counts were 198 nsec-tree,
1,420 Heartwood and 1,378 Sapwood tests, with firmware-backend storage faults,
T-Display build and simulated-device browser checks recorded separately.

Owner-held evidence is retained in `/tmp/wrapped-review-20261116/`,
`/tmp/wrapped-device-preview-20261115/` and
`/tmp/wrapped-nsec-preview-20261115/`. These are local paths, not public downloads.
The exact-source T-Display app is 2,256,624 bytes, SHA-256
`b5ffeb6f10c700f6608804b5ca3fb104505c562fceeb035279790dfb017bb153`.
It is now installed on the owner's T-Display under that separate authorisation;
this is a preview installation, not a public firmware release.

## Required review outcome and remaining gates

Return a report naming the reviewed revisions and dependencies, scope and
exclusions, severity and reproduction for each finding, suggested correction,
and retest results tied to replacement revisions. State any unresolved issues
or unavailable evidence and which format/custody claims the review supports.
Report vulnerabilities privately through [SECURITY.md](SECURITY.md), rather
than a public issue. No clean bill of health is inferred from missing findings.

The full wrapped-account OLED/button ceremony, cancel/timeout/preheld-button,
USB-only/Wi-Fi wrapping, real remove/restore, reboot/signing with restored B,
uncertain-ack restart, power-cut atomicity and sealed-state checks remain
pending on a separate disposable board. The pinned Heartwood review contains
the acceptance table. The successful existing-identity signing check after
installation does not fulfil those recovery gates. Signet's Android document
save/restore ceremony on a physical phone also remains pending. Code review,
host tests and mobile-viewport browser captures do not fulfil those checks.
