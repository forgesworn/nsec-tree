# Wrapped-account preview, 15 November 2026

## Local candidates

| Repository | Branch | Result |
| --- | --- | --- |
| nsec-tree | `feat/wrapped-nsec-backups` | Opt-in `nsec-tree/wrapped`, format specification and public interoperability vector; candidate `1.7.0-alpha.1`, alpha dist-tag configured. |
| heartwood | `feat/wrapped-nsec-reference` | Matching Rust reference in `nsec-tree-rs`. No bridge or device operation. |
| signet-app | `feat/wrapped-persona-backups` | Owner-authenticated file export, file read-back and confirmed restore of local imported accounts. |
| bray | `feat/wrapped-identity-backups` | Owner CLI/SDK wrap/check/load; imported provenance, explicit activation, forbidden-key enforcement and zeroisation. No new MCP tool. |

Canonical format and ecosystem contract: [WRAPPED-NSEC.md](WRAPPED-NSEC.md).
Recovering B requires **the same root construction from A and the encrypted
record**. B's original raw key and npub are preserved. A alone cannot recover
an unrelated B. Existing frozen derivation and Recovery Words vectors were
not changed.

Sapwood, Bark, Cambium and heartwood-esp32 are unchanged. The ESP32 checkout
already had divergent local/upstream history; Cambium had unrelated changes.
Firmware slot approval, raw-mode restore, capability negotiation and physical
recovery remain future work under the documented contract. No hardware backup
or inherited app permission is claimed.

## Dependency and release gate

Delivery has resumed: the Rust reference is pushed for review; the library alpha is being prepared for publication. Consumer branches remain unmerged until the published package is verified. Consumer
manifests pin the candidate `1.7.0-alpha.1`. Their lock entries record the
**locally packed** candidate's integrity at the intended registry URL; that
does not mean the package exists in the registry. Clean registry installs and
consumer merges require publication of this exact candidate first. If the
package changes before publication, repack and regenerate both consumer lock
entries from the actual released artifact.

Retained local package evidence:

* `/tmp/wrapped-nsec-preview-20261115/nsec-tree-1.7.0-alpha.1.tgz`
* `/tmp/wrapped-nsec-preview-20261115/pack.json`
* SHA-512 integrity:
  `sha512-GV0/x9T/bjCqyo1q1HVnJo8AAaFE+Apc7LMvnI1PhLW5PsRhCUUxIzLUTEwChGBrk4TwCNuoZ+HY7Vp5ddMDQg==`

The package was built from a clean `dist/`, inspected and installed locally
into both consumers. It contains the wrapped subpath and its specification;
it contains no test secrets, local paths or stale CLI build output.
Existing consumer `node_modules` were refreshed for local testing; no
unrelated dependency upgrades are included in the consumer lockfiles.
Their transitive Signet Protocol/Canary dependencies retain nsec-tree 1.6.0;
the new alpha is pinned only for the new direct wrapped API. Local clean
installs use `npm cache add <candidate.tgz>` followed by `npm ci
--prefer-offline` to verify the recorded lock and packed bytes without
publishing. Signet's existing Git contacts dependency needs its normal
prepare build, so do not suppress install scripts there. Bray was also
checked with install scripts suppressed. An empty-cache registry install
still needs the alpha release.

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
* Signet: typecheck, production build and 71 focused tests passed against the
  final packed codec after a clean locked install with its Git dependency's
  normal prepare build. Another 68 derivation, recovery-word, Signet and vault
  compatibility tests passed. An earlier broader focused run passed 206 tests.
  Mobile-viewport Chrome completed restore, fresh PIN approvals, exact-npub
  confirmation, downloaded-file decryption and saved-file check. Captures are
  under `signet-app/e2e/results/wrapped-account-restore-an-80c12-rt-and-check-the-saved-file-mobile-chrome-preview/`.
  The local run used installed Google Chrome via a temporary Playwright
  project (`browserName: chromium`, `channel: chrome`); the stock project's
  matching browser revision was not cached. The temporary configuration was
  removed afterwards. This is desktop Chrome with a mobile viewport, not a
  physical phone test.
* Bray: lint/build and all 1,945 tests across 138 files passed.
  A regression confirms a matching derivation cannot replace imported
  provenance or orphan its active private-key buffer.

The existing Bray bunker missing-URI smoke test initially picked up the
operator's saved home configuration. Its environment is now isolated using
the suite's existing temporary config home; the focused regression passed.

## Cleanup and retained evidence

No task-created server, browser, fixture or emulator is left running. The
task-created Heartwood `target/` cache was removed after recording validation.
Existing consumer dependency directories are retained for local preview.
The candidate tarball/pack manifest and the two successful browser captures
named above are retained for review. Temporary install/build/test logs were
removed after recording their results here. All four candidates are local
commits on the named branches; no worktree was created.
