import { describe, it, expect } from 'vitest'
import { fromMnemonic } from '../src/root-mnemonic.js'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { schnorr } from '@noble/curves/secp256k1.js'
import { decodeNpub } from '../src/encoding.js'

describe('NIP-06 compatibility', () => {
  const mnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  it('nsec-tree path does not collide with NIP-06 path', () => {
    const seed = mnemonicToSeedSync(mnemonic)
    const nip06 = HDKey.fromMasterSeed(seed).derive("m/44'/1237'/0'/0/0")
    const nsecTree = HDKey.fromMasterSeed(seed).derive("m/44'/1237'/727'/0'/0'")
    expect(nip06.privateKey).not.toEqual(nsecTree.privateKey)
  })

  it('fromMnemonic uses the nsec-tree path, not NIP-06', () => {
    const seed = mnemonicToSeedSync(mnemonic)
    const expected = HDKey.fromMasterSeed(seed).derive("m/44'/1237'/727'/0'/0'")
    const root = fromMnemonic(mnemonic)
    const expectedPub = schnorr.getPublicKey(expected.privateKey!)
    const actualPub = decodeNpub(root.masterPubkey)
    expect(actualPub).toEqual(expectedPub)
    root.destroy()
  })
})
