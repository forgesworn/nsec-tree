import { describe, it, expect } from 'vitest'
import { schnorr } from '@noble/curves/secp256k1.js'
import { fromNsec } from '../src/root-nsec.js'
import { fromMnemonic } from '../src/root-mnemonic.js'
import { derive } from '../src/derive.js'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { encodeNsec, decodeNpub } from '../src/encoding.js'
import { getSecret, rootSecrets } from '../src/types.js'

describe('fromNsec', () => {
  const testKey = new Uint8Array(32).fill(0xab)

  it('creates a TreeRoot from raw bytes', () => {
    const root = fromNsec(testKey)
    expect(root.masterPubkey).toBeDefined()
    expect(root.masterPubkey.startsWith('npub1')).toBe(true)
    root.destroy()
  })

  it('creates a TreeRoot from bech32 nsec string', () => {
    const nsecStr = encodeNsec(testKey)
    const root = fromNsec(nsecStr)
    expect(root.masterPubkey).toBeDefined()
    root.destroy()
  })

  it('same nsec produces same masterPubkey', () => {
    const a = fromNsec(testKey)
    const b = fromNsec(testKey)
    expect(a.masterPubkey).toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('different nsecs produce different masterPubkeys', () => {
    const otherKey = new Uint8Array(32).fill(0xcd)
    const a = fromNsec(testKey)
    const b = fromNsec(otherKey)
    expect(a.masterPubkey).not.toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('masterPubkey differs from direct nsec pubkey (intermediate HMAC)', () => {
    const directPub = schnorr.getPublicKey(testKey)
    const root = fromNsec(testKey)
    const masterPubBytes = decodeNpub(root.masterPubkey)
    expect(masterPubBytes).not.toEqual(directPub)
    root.destroy()
  })

  it('destroy zeroes the internal secret', () => {
    const root = fromNsec(testKey)
    root.destroy()
    expect(() => getSecret(root)).toThrow('destroyed')
  })

  it('destroy actually zeroes the buffer bytes', () => {
    const root = fromNsec(testKey)
    const secretRef = rootSecrets.get(root)!
    expect(secretRef.some(b => b !== 0)).toBe(true)
    root.destroy()
    expect(secretRef.every(b => b === 0)).toBe(true)
  })

  it('derive rejects destroyed root', () => {
    const root = fromNsec(testKey)
    root.destroy()
    expect(() => derive(root, 'social')).toThrow('destroyed')
  })

  it('rejects invalid input', () => {
    expect(() => fromNsec(new Uint8Array(16))).toThrow()
  })
})

describe('fromMnemonic', () => {
  const testMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  it('creates a TreeRoot from a valid mnemonic', () => {
    const root = fromMnemonic(testMnemonic)
    expect(root.masterPubkey.startsWith('npub1')).toBe(true)
    root.destroy()
  })

  it('same mnemonic produces same masterPubkey', () => {
    const a = fromMnemonic(testMnemonic)
    const b = fromMnemonic(testMnemonic)
    expect(a.masterPubkey).toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('different passphrase produces different tree', () => {
    const a = fromMnemonic(testMnemonic)
    const b = fromMnemonic(testMnemonic, 'mypassphrase')
    expect(a.masterPubkey).not.toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('mnemonic path differs from nsec path for same underlying key', () => {
    const mnemonicRoot = fromMnemonic(testMnemonic)
    const seed = mnemonicToSeedSync(testMnemonic)
    const nip06Key = HDKey.fromMasterSeed(seed).derive("m/44'/1237'/0'/0/0")
    const nsecRoot = fromNsec(nip06Key.privateKey!)
    expect(mnemonicRoot.masterPubkey).not.toBe(nsecRoot.masterPubkey)
    mnemonicRoot.destroy()
    nsecRoot.destroy()
  })

  it('rejects invalid mnemonic', () => {
    expect(() => fromMnemonic('not a valid mnemonic at all')).toThrow()
  })

  it('rejects non-string passphrase', () => {
    expect(() => fromMnemonic(testMnemonic, 42 as unknown as string)).toThrow('passphrase must be a string')
  })
})
