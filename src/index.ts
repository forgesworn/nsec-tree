export { fromNsec } from './root-nsec.js'
export { fromMnemonic } from './root-mnemonic.js'
export { derive, zeroise } from './derive.js'
export { recover } from './recover.js'
export { createBlindProof, createFullProof, verifyProof } from './proof.js'
export type { TreeRoot, Identity, LinkageProof } from './types.js'
export { NsecTreeError, DEFAULT_SCAN_RANGE, MAX_SCAN_RANGE, MAX_INDEX } from './types.js'
export { deriveFromIdentity } from './derive-identity.js'
export { derivePersona, deriveFromPersona, recoverPersonas, DEFAULT_PERSONA_NAMES } from './persona.js'
export type { Persona } from './persona.js'
export { toUnsignedEvent, fromEvent, NSEC_TREE_EVENT_KIND, NSEC_TREE_D_PREFIX } from './event.js'
export type { UnsignedEvent } from './event.js'
export {
  createMnemonicRecoveryWords,
  createNsecRecoveryWords,
  decodeRecoveryWords,
  recoveryWordsToBytes,
  recoveryWordsFromBytes,
  restoreRecoveryWords,
  RECOVERY_HEADER_WORDS,
  RECOVERY_WORDS_VERSION,
} from './recovery-words.js'
export type {
  DecodedRecoveryWords,
  RecoveryKind,
  RestoredRecovery,
} from './recovery-words.js'
