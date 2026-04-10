/**
 * NIP-78 round-trip — convert a linkage proof to a Kind 30078 event,
 * then extract it back. Demonstrates the `nsec-tree/event` subpath.
 *
 * Run: npx tsx examples/nip78-event.ts
 */

import { fromMnemonic, derive } from 'nsec-tree'
import { createFullProof, verifyProof } from 'nsec-tree/proof'
import { toUnsignedEvent, fromEvent, NSEC_TREE_EVENT_KIND } from 'nsec-tree/event'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(MNEMONIC)
const child = derive(root, 'commerce')

console.log('=== nsec-tree NIP-78 round-trip ===\n')
console.log(`Child npub: ${child.npub}\n`)

// 1. Create a full linkage proof (reveals purpose + index).
const proof = createFullProof(root, child)

// 2. Convert to an unsigned NIP-78 event. The application signs and publishes
//    this with its own Nostr library — toUnsignedEvent never touches secrets.
const unsigned = toUnsignedEvent(proof)

console.log('Unsigned NIP-78 event:')
console.log(`  kind:       ${unsigned.kind} (NSEC_TREE_EVENT_KIND = ${NSEC_TREE_EVENT_KIND})`)
console.log(`  pubkey:     ${unsigned.pubkey}`)
console.log(`  created_at: ${unsigned.created_at}`)
console.log(`  tags:`)
for (const tag of unsigned.tags) {
  console.log(`    [${tag.map(v => `"${v.length > 32 ? v.slice(0, 16) + '…' + v.slice(-8) : v}"`).join(', ')}]`)
}
console.log(`  content:    "${unsigned.content}"\n`)

// 3. Pretend the event has been signed and relayed back to a verifier.
//    fromEvent only reads pubkey + tags — it doesn't need id/sig.
const recovered = fromEvent({ pubkey: unsigned.pubkey, tags: unsigned.tags })

console.log('Extracted LinkageProof:')
console.log(`  masterPubkey: ${recovered.masterPubkey}`)
console.log(`  childPubkey:  ${recovered.childPubkey}`)
console.log(`  purpose:      ${recovered.purpose}`)
console.log(`  index:        ${recovered.index}\n`)

// 4. Verify the proof end-to-end.
const valid = verifyProof(recovered)
console.log(`  Round-trip valid? ${valid}`)

root.destroy()
console.log('\n  Done.')
