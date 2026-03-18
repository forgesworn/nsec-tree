import type { Identity, TreeRoot } from './types.js'
import { DEFAULT_SCAN_RANGE, MAX_SCAN_RANGE, NsecTreeError } from './types.js'
import { derive } from './derive.js'

export function recover(
  root: TreeRoot,
  purposes: string[],
  scanRange = DEFAULT_SCAN_RANGE,
): Map<string, Identity[]> {
  if (!Array.isArray(purposes)) {
    throw new NsecTreeError('purposes must be an array of strings')
  }
  if (!Number.isInteger(scanRange) || scanRange < 1 || scanRange > MAX_SCAN_RANGE) {
    throw new NsecTreeError(`scanRange must be an integer in [1, ${MAX_SCAN_RANGE}], got ${scanRange}`)
  }
  const result = new Map<string, Identity[]>()

  for (const purpose of purposes) {
    const identities: Identity[] = []
    for (let i = 0; i < scanRange; i++) {
      identities.push(derive(root, purpose, i))
    }
    result.set(purpose, identities)
  }

  return result
}
