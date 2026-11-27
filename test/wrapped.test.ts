import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createCipheriv, createHmac, hkdfSync } from 'node:crypto'
import { fromNsec } from '../src/root-nsec.js'
import { derive, zeroise } from '../src/derive.js'
import { encodeNpub, hexToBytes } from '../src/encoding.js'
import { NsecTreeError } from '../src/types.js'
import { wrapNsec, unwrapNsec } from '../src/wrapped.js'

const vector = JSON.parse(readFileSync(new URL('./fixtures/wrapped-nsec-v1.json', import.meta.url), 'utf8'))
afterEach(() => vi.restoreAllMocks())

describe('wrapped raw nsecs', () => {
  it('rejects authenticated payloads with an invalid scalar or mismatched public key', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const original = Buffer.from(vector.record.slice(6), 'base64url')
    const header = original.subarray(0, 51)
    const rootSecret = createHmac('sha256', Buffer.from(vector.masterHex, 'hex')).update('nsec-tree-root').digest()
    const key = Buffer.from(hkdfSync('sha256', rootSecret, header.subarray(7, 39), 'nsec-tree/wrapped-nsec/v1', 32))
    try {
      for (const payload of [Buffer.alloc(64), Buffer.concat([Buffer.from(vector.importedHex, 'hex'), Buffer.alloc(32)])]) {
        const cipher = createCipheriv('aes-256-gcm', key, header.subarray(39), {authTagLength: 16})
        cipher.setAAD(header)
        const encrypted = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()])
        const record = 'nstw1:' + Buffer.concat([header, encrypted]).toString('base64url')
        await expect(unwrapNsec(root, record)).rejects.toThrow(NsecTreeError)
        payload.fill(0)
      }
    } finally { rootSecret.fill(0); key.fill(0); root.destroy() }
  })

  it('matches an independent Node crypto vector and preserves the exact raw key', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const key = hexToBytes(vector.importedHex)
    const entropy = [hexToBytes(vector.saltHex), hexToBytes(vector.nonceHex)]
    const random = crypto.getRandomValues.bind(crypto)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((out: any) => {
      // Noble also requests entropy for scalar-multiplication blinding.
      // Our envelope fills subarrays of its 51-byte header only.
      if (out.buffer.byteLength !== 51) return random(out)
      out.set(entropy.shift()!)
      return out
    })
    try {
      expect(await wrapNsec(root, key)).toBe(vector.record)
      const restored = await unwrapNsec(root, vector.record, encodeNpub(hexToBytes(vector.importedPublicHex)))
      try {
        expect(restored.privateKey).toEqual(key)
        expect(restored.publicKey).toEqual(hexToBytes(vector.importedPublicHex))
        expect(restored).not.toHaveProperty('purpose')
        expect(restored).not.toHaveProperty('nsec')
      } finally { restored.privateKey.fill(0) }
      expect(key).toEqual(hexToBytes(vector.importedHex))
    } finally { root.destroy(); key.fill(0) }
  })

  it('uses fresh randomness and keeps the caller buffer intact', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const key = hexToBytes(vector.importedHex)
    try {
      const first = await wrapNsec(root, key)
      expect(await wrapNsec(root, key)).not.toBe(first)
      expect(first).not.toContain(vector.importedHex)
      expect(first).not.toContain(root.masterPubkey)
      expect(key).toEqual(hexToBytes(vector.importedHex))
    } finally { root.destroy(); key.fill(0) }
  })

  it('fails with a wrong root or wrong expected identity', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const wrong = fromNsec(new Uint8Array(32).fill(3))
    try {
      await expect(unwrapNsec(wrong, vector.record)).rejects.toThrow(NsecTreeError)
      await expect(unwrapNsec(root, vector.record, wrong.masterPubkey)).rejects.toThrow('identity')
    } finally { root.destroy(); wrong.destroy() }
  })

  it('authenticates every header, ciphertext and tag byte', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const original = Buffer.from(vector.record.slice(6), 'base64url')
    try {
      for (let i = 0; i < original.length; i++) {
        const tampered = Buffer.from(original)
        tampered[i] ^= 1
        await expect(unwrapNsec(root, 'nstw1:' + tampered.toString('base64url'))).rejects.toThrow(NsecTreeError)
      }
    } finally { root.destroy() }
  })

  it.each(['', 'nstw2:abc', 'nstw1:!', 'nstw1:' + 'A'.repeat(10000), vector.record + '=', vector.record + '\n', vector.record.slice(0, -1)])('rejects malformed or non-canonical records', async record => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    try { await expect(unwrapNsec(root, record)).rejects.toThrow(NsecTreeError) }
    finally { root.destroy() }
  })

  it('rejects invalid scalar inputs and destroyed roots', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    for (const key of [new Uint8Array(31), new Uint8Array(32), new Uint8Array(32).fill(255)]) {
      await expect(wrapNsec(root, key)).rejects.toThrow(NsecTreeError)
    }
    root.destroy()
    await expect(wrapNsec(root, hexToBytes(vector.importedHex))).rejects.toThrow('destroyed')
    await expect(unwrapNsec(root, vector.record)).rejects.toThrow('destroyed')
  })

  it('snapshots inputs before the first await and leaves existing derivations unchanged', async () => {
    const root = fromNsec(hexToBytes(vector.masterHex))
    const before = derive(root, 'test', 0)
    const key = hexToBytes(vector.importedHex)
    try {
      const pending = wrapNsec(root, key)
      key.fill(0)
      const restored = await unwrapNsec(root, await pending)
      try { expect(restored.privateKey).toEqual(hexToBytes(vector.importedHex)) }
      finally { restored.privateKey.fill(0) }
      const after = derive(root, 'test', 0)
      try { expect(after.npub).toBe(before.npub) } finally { zeroise(after) }
    } finally { root.destroy(); zeroise(before) }
  })
})
