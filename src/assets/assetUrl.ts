import { CONFIG } from '../config/evergrow.config'

/** Build a public asset URL that works locally and under a GitHub Pages subpath. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

/** Prefix every localStorage key with the project namespace. */
export function storageKey(key: string): string {
  return `${CONFIG.ui.storagePrefix}${key}`
}
