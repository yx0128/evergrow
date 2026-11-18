import { CONFIG } from '../config/evergrow.config'

/** Prefix every localStorage key with the project namespace. */
export function storageKey(key: string): string {
  return `${CONFIG.ui.storagePrefix}${key}`
}
