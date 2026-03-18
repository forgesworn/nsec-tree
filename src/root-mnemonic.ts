import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { NsecTreeError } from './types.js'
import type { TreeRoot } from './types.js'
import { createTreeRoot } from './root-nsec.js'

const DERIVATION_PATH = "m/44'/1237'/727'/0'/0'"

export function fromMnemonic(mnemonic: string, passphrase?: string): TreeRoot {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new NsecTreeError('Invalid BIP-39 mnemonic')
  }

  const seed = mnemonicToSeedSync(mnemonic, passphrase)
  const master = HDKey.fromMasterSeed(seed)
  const child = master.derive(DERIVATION_PATH)

  if (!child.privateKey) {
    throw new NsecTreeError('Failed to derive private key at nsec-tree path')
  }

  const treeRootSecret = new Uint8Array(child.privateKey)
  seed.fill(0)
  if (child.privateKey) child.privateKey.fill(0)
  if (master.privateKey) master.privateKey.fill(0)

  const root = createTreeRoot(treeRootSecret)
  treeRootSecret.fill(0)
  return root
}
