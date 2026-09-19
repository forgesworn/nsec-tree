import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { fromNsec, derive, zeroise } from '../src/index.js'
import { hexToBytes, bytesToHex } from '../src/encoding.js'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/signet-vault-v1.json', import.meta.url), 'utf8'))
describe('Signet vault derivation vectors', () => {
  for (const vector of fixture.vectors) {
    it(`${vector.purpose} rotation ${vector.index}`, () => {
      const root = fromNsec(hexToBytes(fixture.masterSecretHex))
      const child = derive(root, vector.purpose, vector.index)
      try {
        expect(bytesToHex(child.privateKey)).toBe(vector.privateKeyHex)
        expect(bytesToHex(child.publicKey)).toBe(vector.publicKeyHex)
        expect(child.index).toBe(vector.index)
      } finally {
        zeroise(child)
        root.destroy()
      }
    })
  }
})
