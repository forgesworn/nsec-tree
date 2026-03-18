import { fromMnemonic } from 'nsec-tree'
import {
  derivePersona,
  deriveFromPersona,
  recoverPersonas,
  DEFAULT_PERSONA_NAMES,
} from 'nsec-tree/persona'
import { createBlindProof, verifyProof } from 'nsec-tree/proof'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// 1. Create master from mnemonic
const root = fromMnemonic(MNEMONIC)

console.log('=== nsec-tree: persona derivation ===\n')

// 2. Derive three personas
const personal = derivePersona(root, 'personal')
const bitcoiner = derivePersona(root, 'bitcoiner')
const work = derivePersona(root, 'work')

console.log('Personas (each gets its own kind-0 profile):\n')
console.log(`  personal:  ${personal.identity.npub}`)
console.log(`  bitcoiner: ${bitcoiner.identity.npub}`)
console.log(`  work:      ${work.identity.npub}`)

// 3. Derive group identities within personas
const family = deriveFromPersona(personal, 'canary:group:family-2026')
const meetup = deriveFromPersona(bitcoiner, 'canary:group:local-meetup')
const conference = deriveFromPersona(bitcoiner, 'canary:group:btcpp-2026')

console.log('\nGroup identities (two-level hierarchy):\n')
console.log(`  personal → family-2026:   ${family.npub}`)
console.log(`  bitcoiner → local-meetup: ${meetup.npub}`)
console.log(`  bitcoiner → btcpp-2026:   ${conference.npub}`)

// 4. Blind linkage proof: prove meetup and conference share the same bitcoiner persona
//    without revealing which persona or derivation slot
const meetupProof = createBlindProof(root, bitcoiner.identity)
const conferenceProof = createBlindProof(root, bitcoiner.identity)

console.log('\nBlind linkage proof (meetup ↔ conference share same master):\n')
console.log(`  masterPubkey: ${meetupProof.masterPubkey}`)
console.log(`  childPubkey:  ${meetupProof.childPubkey}`)
console.log(`  purpose:      ${meetupProof.purpose ?? '(hidden)'}`)
console.log(`  valid:        ${verifyProof(meetupProof)}`)

// 5. Persona rotation: bitcoiner compromised → derive at index 1
const bitcoinerRotated = derivePersona(root, 'bitcoiner', 1)

console.log('\nPersona rotation (bitcoiner compromised → index 1):\n')
console.log(`  bitcoiner[0]: ${bitcoiner.identity.npub}`)
console.log(`  bitcoiner[1]: ${bitcoinerRotated.identity.npub}`)
console.log(`  Different?    ${bitcoiner.identity.npub !== bitcoinerRotated.identity.npub}`)

// Linkage proof for continuity: prove old and new are the same master
const rotationProof = createBlindProof(root, bitcoinerRotated.identity)
console.log(`  Rotation proof valid? ${verifyProof(rotationProof)}`)

// 6. Recovery: re-derive all personas from the mnemonic alone
const root2 = fromMnemonic(MNEMONIC)
const recovered = recoverPersonas(root2, DEFAULT_PERSONA_NAMES, 2)

console.log('\nRecovery (scanning default persona names, 2 indices each):\n')
for (const [name, personas] of recovered) {
  const npubs = personas.map(p => p.identity.npub.slice(0, 20) + '…')
  console.log(`  ${name}: ${npubs.join(', ')}`)
}

const recoveredBitcoiner = recovered.get('bitcoiner')![0]!
console.log(`\n  bitcoiner[0] matches original? ${bitcoiner.identity.npub === recoveredBitcoiner.identity.npub}`)

// 7. Clean up
root.destroy()
root2.destroy()
console.log('\n  Root secrets destroyed.')
