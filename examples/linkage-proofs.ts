import { fromMnemonic, derive } from 'nsec-tree'
import { createBlindProof, createFullProof, verifyProof } from 'nsec-tree/proof'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(MNEMONIC)
const social = derive(root, 'social')

console.log('=== nsec-tree: linkage proofs ===\n')

// Blind proof: proves the master owns the child, but does NOT reveal
// which derivation slot (purpose/index) was used.
const blind = createBlindProof(root, social)
console.log('Blind proof (hides derivation slot):\n')
console.log(`  masterPubkey: ${blind.masterPubkey}`)
console.log(`  childPubkey:  ${blind.childPubkey}`)
console.log(`  purpose:      ${blind.purpose ?? '(hidden)'}`)
console.log(`  index:        ${blind.index ?? '(hidden)'}`)
console.log(`  valid:        ${verifyProof(blind)}`)

console.log()

// Full proof: proves ownership AND reveals the purpose and index.
const full = createFullProof(root, social)
console.log('Full proof (reveals derivation slot):\n')
console.log(`  masterPubkey: ${full.masterPubkey}`)
console.log(`  childPubkey:  ${full.childPubkey}`)
console.log(`  purpose:      ${full.purpose}`)
console.log(`  index:        ${full.index}`)
console.log(`  valid:        ${verifyProof(full)}`)

console.log()

// Tampered proof: verification fails
const tampered = { ...blind, childPubkey: '00'.repeat(32) }
console.log(`Tampered proof valid? ${verifyProof(tampered)}`)

root.destroy()
