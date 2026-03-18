import { NsecTreeError } from './types.js'

const encoder = new TextEncoder()

export function validatePurpose(purpose: string): void {
  if (purpose.length === 0) {
    throw new NsecTreeError('Purpose must be non-empty')
  }
  if (purpose.includes('\0')) {
    throw new NsecTreeError('Purpose must not contain null bytes')
  }
  if (purpose.trim().length === 0) {
    throw new NsecTreeError('Purpose must not be whitespace-only')
  }
  const bytes = encoder.encode(purpose)
  if (bytes.length > 255) {
    throw new NsecTreeError(`Purpose exceeds 255 bytes (got ${bytes.length})`)
  }
}
