import { fromMnemonic, derive, recover } from 'nsec-tree'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Create some identities
const root = fromMnemonic(MNEMONIC)
const social = derive(root, 'social')
const commerce = derive(root, 'commerce')

console.log('=== nsec-tree: recovery ===\n')
console.log('Original identities:\n')
console.log(`  social:   ${social.npub}`)
console.log(`  commerce: ${commerce.npub}`)

// Destroy the root — simulate losing access
root.destroy()
console.log('\n  Root destroyed. Simulating recovery...\n')

// Recover: same mnemonic, scan known purposes
const recovered = fromMnemonic(MNEMONIC)
const found = recover(recovered, ['social', 'commerce'])

// recover() derives ALL identities in the scan range — not just "used" ones.
// There is no on-chain activity to detect which indices were previously derived.
// You must know (or conventionalise) which purposes to scan.
console.log('Recovered identities:\n')
for (const [purpose, identities] of found) {
  console.log(`  ${purpose}: scanned ${identities.length} indices`)
  console.log(`    index 0 npub: ${identities[0]!.npub}`)
}

// Verify they match
const recoveredSocial = found.get('social')![0]!
console.log(`\n  social npubs match? ${social.npub === recoveredSocial.npub}`)

recovered.destroy()
console.log('  Done.')
