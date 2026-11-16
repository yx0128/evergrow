import { evergrowConfig } from '../config/evergrow.config'

const base = import.meta.env.BASE_URL

/** Build a public asset URL that works locally and under a GitHub Pages subpath. */
export function assetUrl(path: string): string {
  return `${base}${path.replace(/^\/+/, '')}`
}

/** Prefix every localStorage key with the project namespace. */
export function storageKey(key: string): string {
  return `${evergrowConfig.ui.storagePrefix}${key}`
}
