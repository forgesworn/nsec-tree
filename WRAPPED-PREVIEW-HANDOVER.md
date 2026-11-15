# Wrapped-account preview, 15 November 2026

## Delivery status

| Repository | Review / revision | Result |
| --- | --- | --- |
| nsec-tree | [PR #57](https://github.com/forgesworn/nsec-tree/pull/57), merged | Opt-in `nsec-tree/wrapped`, format specification and public interoperability vector; published `1.7.0-alpha.1`, alpha dist-tag verified; stable latest remains 1.6.0. |
| heartwood | [PR #26](https://github.com/forgesworn/heartwood/pull/26), merged at `80cf4c6` | Matching Rust reference in `nsec-tree-rs`. No bridge or device operation. |
| signet-app | [PR #119](https://github.com/forgesworn/signet-app/pull/119), merged at `b15a010` | Owner-authenticated file export, file read-back and confirmed restore of local imported accounts. `0.28.0` live on the web, with signed Android downloads and Zapstore publication. |
| bray | [PR #173](https://github.com/forgesworn/bray/pull/173), merged; release source `2bde4c0` | Published `nostr-bray@3.15.0`: owner CLI/SDK wrap/check/load; imported provenance, explicit activation, forbidden-key enforcement and zeroisation. No new MCP tool. |

Canonical format and ecosystem contract: [WRAPPED-NSEC.md](WRAPPED-NSEC.md).
Recovering B requires **the same root construction from A and the encrypted
record**. B's original raw key and npub are preserved. A alone cannot recover
an unrelated B. Existing frozen derivation and Recovery Words vectors were
not changed.

At the software preview release, Sapwood, Bark, Cambium and heartwood-esp32
were unchanged. The hardware continuation below is a separate change. No
physical recovery acceptance or inherited app permission is claimed.

## Hardware continuation

Heartwood firmware and Sapwood now have paired `feat/wrapped-nsec-device`
branches for an authenticated, USB-only wrap/check/restore ceremony. Firmware
advertises `wrapped_nsec_usb_v1`; each operation shows the full root and target
npubs, requires all three approval pages and a fresh five-second physical hold.
Raw secrets stay on the device. Sapwood downloads ciphertext and requires a
saved-file check before enabling restore for that same root/file/expected npub.

* [heartwood-esp32 #309](https://github.com/forgesworn/heartwood-esp32/pull/309),
  draft at `a44431e`: device codec, frame contract, approval and storage.
* [Sapwood #200](https://github.com/forgesworn/sapwood/pull/200), draft at
  `9bf6dc4`: owner controls, exact receipt checks and saved-file restore gate.

Local verification passed 1,419 Heartwood host unit tests plus integration
tests, the firmware-backend codec/storage tests, all 49 panel-preview tests,
all 1,374 Sapwood tests, Svelte checks and a production build. Chrome exercised
the simulated-device UI at 390 pixels from the committed Sapwood revision.
This is browser layout/API evidence, not physical-device evidence. The
T-Display release build succeeded; its 2,335,088-byte application fits the
3,145,728-byte slot. Hosted checks are attached to the paired PRs.

Restore accepts only the next empty raw-key slot, refuses existing master or
persona npubs, clears stale pairing/delegate state, verifies stored fields and
publishes the slot count last. New-slot restore while at-rest seed encryption
is active is refused; PIN/vault configuration is never disabled automatically.
The format fixture is unchanged and matches the published TypeScript/Rust
reference. See Heartwood's `WRAPPED-NSEC-USB.md` and Sapwood's
`docs/wrapped-account-review.md` for the contract and review steps.

Bark and Cambium need no new API for this USB-only path. Their app/identity
approval boundaries remain unchanged. Bark's existing 160 background tests
passed; Cambium was inspected read-only because it has unrelated work in
progress. Bray's published owner CLI/SDK remains the software path and adds no
recovery MCP tool.

**Physical gate:** live hardware has not been opened, flashed, reset or
provisioned during this work and must remain untouched. Physical OLED/button,
reboot/signing and bench power-cut
acceptance need a separate disposable board with verified independent recovery.
The firmware and Sapwood changes remain draft work pending that evidence;
no new firmware release or Sapwood deployment is claimed. Independent security
review remains pending too.

Retained hardware-preview evidence is under
`/tmp/wrapped-device-preview-20261115/`: the application image and source
identity, rendered approval pages, the exact-commit Chrome capture, test
receipts and CI links. No worktree, emulator or long-running fixture was
created for this continuation.

## Dependency and release gate

The library alpha is published through npm OIDC from `494a7f6` after hosted
Node 22/24 tests, release gates and independent-runner reproducibility checks
passed. npm tarball bytes and provenance metadata were read back. The alpha
tag is `1.7.0-alpha.1`; stable `latest` remains `1.6.0`. This is still a test-key
preview without independent security review or physical recovery acceptance.

Both consumers now pin the published artifact's actual integrity. Bray's
locked install passed with a new, empty npm cache; Signet's normal locked
registry install and Git contacts prepare build passed. Both consumer PR gates
passed before merge. The hardware continuation is a separate unreleased change.

Public releases:

* [nsec-tree 1.7.0-alpha.1](https://github.com/forgesworn/nsec-tree/releases/tag/v1.7.0-alpha.1)
  — npm `alpha`; stable `latest` remains 1.6.0.
* [Bray 3.15.0](https://github.com/forgesworn/bray/releases/tag/v3.15.0)
  — npm `nostr-bray`, verified `latest` 3.15.0. Independent runners produced
  identical tarballs; downloaded registry bytes matched the published integrity.
  A fresh recipient install wrapped and restored the public disposable key,
  retained imported provenance, required explicit selection, signed an offline
  event successfully and refused both derivation proof forms. Output mode 0600,
  wrong-npub rejection and refusal to overwrite an existing file were checked.
* [My Signet 0.28.0](https://github.com/forgesworn/signet-app/releases/tag/v0.28.0)
  — signed APK versionCode 2800. The official release script reused the passing
  exact-source PR tests (`SKIP_TESTS=1`), built the release APK and verified its
  canonical certificate, embedded version and increase over live versionCode
  2700. GitHub and Zapstore CDN download hashes agree:
  `4872d76f23be0fddc08341adeb4723e3c909cb72416a96d05cd3a0edc1365e29`.
  Canonical signing certificate:
  `7f9994a0cfc6057a3d98aa5e44c4bddbb053cff3c9c311fd4391886422ca3730`.
  Zapstore release `1f9daa3d88dce5a0e7e8dce16c9362a6a782c460f7ec4083ea8b37a4b3f42a5b`
  references file `f2ceda3045dfb668225677fd7ff9deeccc138872bec49c157abed26133650400`.
  Both event signatures, the existing publisher, version, certificate and file
  hash were verified independently on `wss://relay.zapstore.dev`.
  The public manifest, stable APK and versioned APK at [mysignet.app/get](https://mysignet.app/get/)
  match the GitHub release bytes. The served web entry matches the hosted build
  output and contains version 0.28.0, source `b15a010` and the wrapped-backup flow.
  The main deployment passed all its browser and production cross-app signing
  checks in [run 43765051742](https://github.com/forgesworn/signet-app/actions/runs/43765051742).

Retained local package evidence:

* `/tmp/wrapped-nsec-preview-20261115/nsec-tree-1.7.0-alpha.1.tgz`
* `/tmp/wrapped-nsec-preview-20261115/pack.json`
* SHA-512 integrity:
  `sha512-8oIIM3TCr46o82fZDdT6kRI/3d6vr75DLRMs0RyjG37/e31j/wGbslUE+fYDn2iHWUb2f3qyFl7gNoNXkQXHNA==`

The package was built from a clean `dist/`, inspected and installed locally
into both consumers. It contains the wrapped subpath and its specification;
it contains no test secrets, local paths or stale CLI build output.
Existing consumer `node_modules` were refreshed for local testing; no
unrelated dependency upgrades are included in the consumer lockfiles.
Their transitive Signet Protocol/Canary dependencies retain nsec-tree 1.6.0;
the new alpha is pinned only for the direct wrapped API. The initial local
pack differed from the hosted package only in four public-file modes (0600
versus 0644); all 50 file contents were identical. Normalising those modes
reproduced the hosted npm integrity exactly. The retained tarball and both
consumer lock entries now match the published bytes.

Before real-key use, review the format and custody implementation independently
and retain an independent backup. An alpha publication, public CI and a
physical wipe/restore demonstration are separate evidence gates.

## Signet review steps

Use disposable keys and a local owner Signet restored from known recovery
words. Open the identities page and select an `.nstw` file made with that same
root. Checking it requires fresh owner authentication and displays its exact
npub. Give it a name, confirm restore and authenticate again. It appears as an
imported account without automatic activation or a derived-key recovery claim.

Open that account's Manage identity page. Download its encrypted backup and
authenticate. Save the generic `imported-account.nstw` file, select that saved
file under Check saved backup file and authenticate once more. Expect an exact
npub confirmation. Keep this file plus the owner's recovery words. Check a
wrong-root/corrupt file is refused; existing accounts are not overwritten.
The controls are unavailable for paired-child, dependant and hardware keys.

Automated browser scenario: `e2e/wrapped-account.spec.ts` in signet-app.
Run `npx playwright test e2e/wrapped-account.spec.ts --project=mobile-chromium
--workers=1` with that checkout's supported Playwright browser installed.

## Bray review steps

Configure a local owner master using Bray's existing key input. Permit only
the selected input/output directory with `BRAY_INPUT_DIRS`. Use a disposable
0600 file containing B's nsec or raw hex:

```text
nostr-bray key-wrap ./existing.key ./account.nstw
nostr-bray key-check ./account.nstw <B-npub>
```

The file is 0600, checked after writing and never overwritten. In interactive
shell mode, `key-load ./account.nstw <B-npub>` loads B only into that process;
`switch <B-npub>` is a separate action. Listing identifies it as imported and
both proof forms refuse it. Forbidden npubs are refused before caching.
SDK equivalents are on `IdentityContext` and `nostr-bray/identity`.

## Verification

* nsec-tree: 198 tests, clean build and typecheck passed.
* Heartwood: workspace tests with `--locked` and reference-crate Clippy with
  warnings denied passed. Shared fixture is identical to the TypeScript one.
  All 18 hosted PR/push checks passed before merge. Post-merge workspace CI,
  documentation deployment and all three Docker architecture checks passed.
  The normal main-image publication also passed in
  [run 43764176772](https://github.com/forgesworn/heartwood/actions/runs/43764176772),
  reporting digest `sha256:ccccf8257b150f2eb4461aa02b712f2e04fbed75ff179ae033536fb3c567b18e`.
  Independent registry read-back is unverified: anonymous GHCR access was
  refused and the local GitHub credential lacks `read:packages`. Registry
  visibility and credentials were left unchanged. The reference codec is not
  called by a device operation or the server binary.
* Signet: clean locked registry install, the Git dependency's normal prepare
  build, typecheck, production build and local compatibility checks passed.
  Final hosted PR CI passed all 8,697 JavaScript tests in 599 suites, conformance,
  typecheck, build, the wrapped-account browser journey, Android service tests
  and the Android debug build.
  The main deployment passed 36 mobile Chromium regressions, 11 WebKit checks,
  contact-entry and signer-reconnect checks, local cross-app signing and a
  production cross-app signing smoke test.
  Mobile-viewport Chrome refused wrong-root/tampered files, completed restore,
  fresh PIN approvals, exact-npub
  confirmation, downloaded-file decryption and saved-file check. Captures are
  under `signet-app/e2e/results/wrapped-account-restore-an-80c12-rt-and-check-the-saved-file-mobile-chrome-preview/`.
  The local run used installed Google Chrome via a temporary Playwright
  project (`browserName: chromium`, `channel: chrome`); the stock project's
  matching browser revision was not cached. The temporary configuration was
  removed afterwards. This is desktop Chrome with a mobile viewport, not a
  physical phone test.
  A separate check against the deployed production site passed in 11.9 seconds:
  the same restore/export/read-back journey used visible Settings/Personas
  navigation with no development harness. Relay traffic stayed in a local
  fixture; only public disposable keys were used. Its two captures are under
  `/tmp/wrapped-nsec-preview-20261115/signet-public-browser/`.
* Signet Android: the system document picker now saves only the encrypted
  envelope, handles cancellation without a success claim and performs bounded
  byte read-back. All 78 native unit tests passed. A physical phone save/restore
  ceremony has not run. No general storage permission was added.
* Bray: lint/build and all 1,945 tests across 138 files passed.
  A regression confirms a matching derivation cannot replace imported
  provenance or orphan its active private-key buffer.

The existing Bray bunker missing-URI smoke test initially picked up the
operator's saved home configuration. Its environment is now isolated using
the suite's existing temporary config home; the focused regression passed.

## Cleanup and retained evidence

No task-created server, browser, fixture or emulator is left running. The
task-created Heartwood `target/` cache, fresh npm cache and recipient-install
dependencies were removed after recording validation. The release's own
Gradle/Kotlin daemons were stopped. Existing consumer dependency directories
are retained for local preview. No worktree was created; the four merged
feature branches were verified against their merged PR heads and removed
locally and remotely.

Retained evidence under `/tmp/wrapped-nsec-preview-20261115/`:

* The exact published nsec-tree tarball, `pack.json` and `npm-readback.json`.
* `bray-npm-readback.json`, `bray-recipient-readback.json` and the small recipient
  smoke script/package manifest, without its installed dependencies.
* `signet-0.28.0/`: signed APK, manifest, certificate and embedded-version reports.
* `signet-public-readback.json` and `signet-zapstore-events.json`: public download
  hashes, web revision and signed release/file events; the read-back script.
* `signet-public-browser/`, its standalone Playwright config/spec and successful
  run receipt. The two earlier local browser captures named above also remain.

Temporary install/build/test logs and duplicate tarballs/APKs were removed
after recording their results here. Public PRs and releases are linked above.
