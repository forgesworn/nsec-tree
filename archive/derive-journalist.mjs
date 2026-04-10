import { fromMnemonic, derive } from './dist/index.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { createInterface } from 'readline'

const rl = createInterface({ input: process.stdin })
const lines = []
for await (const line of rl) lines.push(line.trim())
const [mnemonic, passphrase] = lines

const root = fromMnemonic(mnemonic, passphrase || undefined)

for (const purpose of ['nostr:persona:veil-demo-journalist', 'persona/veil-demo-journalist']) {
  const id = derive(root, purpose)
  console.log(`purpose: ${purpose}`)
  console.log(`npub:    ${id.npub}`)
  console.log(`pubkey:  ${id.publicKey}`)
  console.log(`nsec:    ${id.nsec}`)
  console.log(`privkey: ${bytesToHex(id.privateKey)}`)
  console.log()
}
root.destroy()
