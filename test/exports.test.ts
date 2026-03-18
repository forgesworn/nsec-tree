import { describe, it, expect } from 'vitest'

describe('subpath exports', () => {
  it('index exports full API', async () => {
    const mod = await import('../src/index.js')
    expect(mod.fromNsec).toBeDefined()
    expect(mod.fromMnemonic).toBeDefined()
    expect(mod.derive).toBeDefined()
    expect(mod.recover).toBeDefined()
    expect(mod.zeroise).toBeDefined()
    expect(mod.createBlindProof).toBeDefined()
    expect(mod.createFullProof).toBeDefined()
    expect(mod.verifyProof).toBeDefined()
  })

  it('core exports no mnemonic or proof functions', async () => {
    const mod = await import('../src/core.js')
    expect(mod.fromNsec).toBeDefined()
    expect(mod.derive).toBeDefined()
    expect(mod.recover).toBeDefined()
    expect(mod.zeroise).toBeDefined()
    expect((mod as any).fromMnemonic).toBeUndefined()
    expect((mod as any).createBlindProof).toBeUndefined()
  })

  it('mnemonic exports only fromMnemonic', async () => {
    const mod = await import('../src/mnemonic.js')
    expect(mod.fromMnemonic).toBeDefined()
  })

  it('proof exports proof functions only', async () => {
    const mod = await import('../src/proof.js')
    expect(mod.createBlindProof).toBeDefined()
    expect(mod.createFullProof).toBeDefined()
    expect(mod.verifyProof).toBeDefined()
  })
})
