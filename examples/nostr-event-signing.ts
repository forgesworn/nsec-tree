import { fromMnemonic, derive } from 'nsec-tree'
import { finalizeEvent, verifyEvent } from 'nostr-tools/pure'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(MNEMONIC)
const social = derive(root, 'social')

console.log('=== nsec-tree + nostr-tools: sign a Nostr event ===\n')
console.log(`Signing identity: ${social.npub}\n`)

// finalizeEvent() accepts Uint8Array — identity.privateKey is already
// Uint8Array. Zero conversion, zero adapter code.
const event = finalizeEvent({
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'Hello from a derived nsec-tree identity!',
}, social.privateKey)

console.log('Signed event:\n')
console.log(`  id:      ${event.id}`)
console.log(`  pubkey:  ${event.pubkey}`)
console.log(`  kind:    ${event.kind}`)
console.log(`  content: ${event.content}`)
console.log(`  sig:     ${event.sig.slice(0, 32)}...`)

// Verify the event — standard Nostr verification, nothing nsec-tree-specific
const valid = verifyEvent(event)
console.log(`\n  Valid Nostr event? ${valid}`)

root.destroy()
console.log('  Done.')
