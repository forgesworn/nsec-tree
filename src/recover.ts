import type { Identity, TreeRoot } from './types.js'
import { DEFAULT_SCAN_RANGE } from './types.js'
import { derive } from './derive.js'

export function recover(
  root: TreeRoot,
  purposes: string[],
  scanRange = DEFAULT_SCAN_RANGE,
): Map<string, Identity[]> {
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
