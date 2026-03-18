import { fromMnemonic, derive, recover } from 'nsec-tree'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const root = fromMnemonic(MNEMONIC)

console.log('=== nsec-tree: bot fleet ===\n')
console.log('Deriving 10 bot identities from one seed:\n')

const bots = Array.from({ length: 10 }, (_, i) => derive(root, 'bot', i))
for (const bot of bots) {
  console.log(`  bot/${bot.index}: ${bot.npub}`)
}

// Recovery: scan the 'bot' purpose to rediscover all 10
console.log('\nRecovering bot fleet from seed...\n')
const found = recover(root, ['bot'], 10)
const recovered = found.get('bot')!
console.log(`  Recovered ${recovered.length} bots`)
console.log(`  All match? ${bots.every((b, i) => b.npub === recovered[i]!.npub)}`)

root.destroy()
console.log('\n  Done.')
