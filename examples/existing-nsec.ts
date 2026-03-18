import { fromNsec, derive, zeroise } from 'nsec-tree/core'

// Use an existing nsec — no mnemonic migration needed.
// nsec-tree/core has zero BIP-32/39 dependencies.
const root = fromNsec('nsec1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqstywftw')

const social = derive(root, 'social')
const throwaway = derive(root, 'throwaway', 42)

console.log('=== nsec-tree: existing nsec ===\n')
console.log('Derived from an existing nsec (no mnemonic required):\n')
console.log(`  social:    ${social.npub}`)
console.log(`  throwaway: ${throwaway.npub} (index 42)`)

// Clean up: zero private key bytes, then destroy root
zeroise(social)
zeroise(throwaway)
console.log(`\n  social privateKey zeroed?    ${social.privateKey.every(b => b === 0)}`)
console.log(`  throwaway privateKey zeroed? ${throwaway.privateKey.every(b => b === 0)}`)

root.destroy()
console.log('  Root secret destroyed.')
