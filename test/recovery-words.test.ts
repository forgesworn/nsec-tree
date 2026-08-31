import { describe, expect, it } from 'vitest'
import { entropyToMnemonic, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import {
  createMnemonicRecoveryWords,
  createNsecRecoveryWords,
  decodeRecoveryWords,
  restoreRecoveryWords,
  recoveryWordsToBytes,
  recoveryWordsFromBytes,
  RECOVERY_WORDS_VERSION,
} from '../src/recovery-words.js'
import { fromMnemonic } from '../src/root-mnemonic.js'
import { fromNsec } from '../src/root-nsec.js'

const ZERO_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const SCALAR_ONE = new Uint8Array(32)
SCALAR_ONE[31] = 1
const MNEMONIC_VECTOR = 'edge obtain doll auto level leave morning abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const SCALAR_ONE_PAYLOAD = `${'abandon '.repeat(23)}diesel`
const RAW_NSEC_VECTOR = `edge obtain lizard frost kitten own grit ${SCALAR_ONE_PAYLOAD}`
const TREE_NSEC_VECTOR = `edge obtain seed afford today police pyramid ${SCALAR_ONE_PAYLOAD}`

describe('ForgeSworn recovery words v1', () => {
  it('wraps a 12-word mnemonic in a typed sequence that cannot be mistaken for BIP-39', () => {
    const words = createMnemonicRecoveryWords(ZERO_MNEMONIC)
    const parts = words.split(' ')

    expect(parts).toHaveLength(19)
    expect(validateMnemonic(words, wordlist)).toBe(false)

    const decoded = decodeRecoveryWords(words)
    expect(decoded.version).toBe(RECOVERY_WORDS_VERSION)
    expect(decoded.kind).toBe('nsec-tree-mnemonic-v1')
    expect(decoded.passphraseRequired).toBe(false)
    expect(decoded.payload).toEqual(new Uint8Array(16))
    expect(decoded.fingerprint).toMatch(/^[0-9a-f]{8}$/)
    decoded.payload.fill(0)
  })

  it('restores the exact v1 tree root from a typed mnemonic', () => {
    const expected = fromMnemonic(ZERO_MNEMONIC)
    const restored = restoreRecoveryWords(createMnemonicRecoveryWords(ZERO_MNEMONIC))

    expect(restored.type).toBe('tree-root')
    if (restored.type === 'tree-root') {
      expect(restored.source).toBe('mnemonic')
      expect(restored.root.masterPubkey).toBe(expected.masterPubkey)
      restored.root.destroy()
    }
    expected.destroy()
  })

  it('binds a mnemonic passphrase without putting it in the words', () => {
    const words = createMnemonicRecoveryWords(ZERO_MNEMONIC, 'correct horse')
    const decoded = decodeRecoveryWords(words)
    expect(decoded.passphraseRequired).toBe(true)
    decoded.payload.fill(0)

    expect(() => restoreRecoveryWords(words)).toThrow(/passphrase required/i)
    expect(() => restoreRecoveryWords(words, 'wrong')).toThrow(/fingerprint/i)

    const expected = fromMnemonic(ZERO_MNEMONIC, 'correct horse')
    const restored = restoreRecoveryWords(words, 'correct horse')
    expect(restored.type).toBe('tree-root')
    if (restored.type === 'tree-root') {
      expect(restored.root.masterPubkey).toBe(expected.masterPubkey)
      restored.root.destroy()
    }
    expected.destroy()
  })

  it('distinguishes an exact raw nsec from the same nsec used as a tree source', () => {
    const exactWords = createNsecRecoveryWords(SCALAR_ONE, 'raw')
    const treeWords = createNsecRecoveryWords(SCALAR_ONE, 'tree')

    expect(exactWords.split(' ')).toHaveLength(31)
    expect(treeWords.split(' ')).toHaveLength(31)
    expect(exactWords).not.toBe(treeWords)
    const exactDecoded = decodeRecoveryWords(exactWords)
    const treeDecoded = decodeRecoveryWords(treeWords)
    expect(exactDecoded.kind).toBe('raw-nsec-v1')
    expect(treeDecoded.kind).toBe('nsec-tree-nsec-v1')
    exactDecoded.payload.fill(0)
    treeDecoded.payload.fill(0)

    const exact = restoreRecoveryWords(exactWords)
    expect(exact.type).toBe('raw-nsec')
    if (exact.type === 'raw-nsec') {
      expect(exact.privateKey).toEqual(SCALAR_ONE)
      exact.privateKey.fill(0)
    }

    const expectedTree = fromNsec(SCALAR_ONE)
    const tree = restoreRecoveryWords(treeWords)
    expect(tree.type).toBe('tree-root')
    if (tree.type === 'tree-root') {
      expect(tree.source).toBe('nsec')
      expect(tree.root.masterPubkey).toBe(expectedTree.masterPubkey)
      tree.root.destroy()
    }
    expectedTree.destroy()
  })

  it('rejects corrupted headers and payload words before returning key material', () => {
    const original = createMnemonicRecoveryWords(ZERO_MNEMONIC).split(' ')
    const headerCorrupt = [...original]
    headerCorrupt[3] = headerCorrupt[3] === 'abandon' ? 'ability' : 'abandon'
    expect(() => decodeRecoveryWords(headerCorrupt.join(' '))).toThrow()

    const payloadCorrupt = [...original]
    payloadCorrupt[10] = payloadCorrupt[10] === 'abandon' ? 'ability' : 'abandon'
    expect(() => decodeRecoveryWords(payloadCorrupt.join(' '))).toThrow()
  })

  it('never silently treats a bare legacy BIP-39 phrase as typed recovery words', () => {
    expect(() => decodeRecoveryWords(ZERO_MNEMONIC)).toThrow(/ForgeSworn recovery words/i)
  })

  it('matches the frozen cross-implementation recovery vectors', () => {
    expect(createMnemonicRecoveryWords(ZERO_MNEMONIC)).toBe(MNEMONIC_VECTOR)
    expect(createNsecRecoveryWords(SCALAR_ONE, 'raw')).toBe(RAW_NSEC_VECTOR)
    expect(createNsecRecoveryWords(SCALAR_ONE, 'tree')).toBe(TREE_NSEC_VECTOR)
  })

  it('roundtrips a compact binary form suitable for typed Shamir v3 shares', () => {
    for (const words of [MNEMONIC_VECTOR, RAW_NSEC_VECTOR, TREE_NSEC_VECTOR]) {
      const compact = recoveryWordsToBytes(words)
      expect(recoveryWordsFromBytes(compact)).toBe(words)
      expect(compact).toHaveLength(words === MNEMONIC_VECTOR ? 28 : 44)
      compact.fill(0)
    }
  })

  it('roundtrips every supported BIP-39 payload strength without guessing a derivation', () => {
    for (const [entropyBytes, expectedWords] of [[16, 19], [20, 22], [24, 25], [28, 28], [32, 31]] as const) {
      const entropy = Uint8Array.from({ length: entropyBytes }, (_, index) => (entropyBytes + index) & 0xff)
      const mnemonic = entropyToMnemonic(entropy, wordlist)
      const typed = createMnemonicRecoveryWords(mnemonic)
      const expected = fromMnemonic(mnemonic)
      const restored = restoreRecoveryWords(typed)

      expect(typed.split(' ')).toHaveLength(expectedWords)
      expect(restored.type).toBe('tree-root')
      if (restored.type === 'tree-root') {
        expect(restored.root.masterPubkey).toBe(expected.masterPubkey)
        restored.root.destroy()
      }
      expected.destroy()
      entropy.fill(0)
    }
  })

  it('rejects an invalid raw scalar before creating recovery words', () => {
    expect(() => createNsecRecoveryWords(new Uint8Array(32), 'raw')).toThrow()
    expect(() => createNsecRecoveryWords(new Uint8Array(32), 'tree')).toThrow()
  })

  it('rejects compact recovery bytes with non-zero padding or a damaged sequence', () => {
    const compact = recoveryWordsToBytes(MNEMONIC_VECTOR)
    compact[compact.length - 1]! |= 1
    expect(() => recoveryWordsFromBytes(compact)).toThrow(/padding/i)
    compact.fill(0)
  })
})
