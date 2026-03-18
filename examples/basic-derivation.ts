import { fromMnemonic, derive } from 'nsec-tree'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Derive two purpose-tagged identities from one mnemonic
const root = fromMnemonic(MNEMONIC)
const social = derive(root, 'social')
const commerce = derive(root, 'commerce')

console.log('=== nsec-tree: basic derivation ===\n')
console.log('Same mnemonic, two unlinkable identities:\n')
console.log(`  social:   ${social.npub}`)
console.log(`  commerce: ${commerce.npub}`)
console.log(`\n  Different npubs? ${social.npub !== commerce.npub}`)

// Deterministic: same mnemonic always produces the same keys
const root2 = fromMnemonic(MNEMONIC)
const social2 = derive(root2, 'social')
console.log(`  Deterministic?   ${social.npub === social2.npub}`)

root.destroy()
root2.destroy()
console.log('\n  Root secrets destroyed.')
