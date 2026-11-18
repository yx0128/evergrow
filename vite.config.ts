import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
// Keep the app config Node-safe: no browser, React or three imports in that file.
import { CONFIG } from './src/config/evergrow.config.ts'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'evergrow'

const replacements: Record<string, string> = {
  APP_NAME: CONFIG.appName,
  THEME_COLOR: CONFIG.palette.background.day,
}

const favicon = (): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${CONFIG.palette.background.day}" />
  <path d="M32 48c-9 0-16-7-16-16 9 0 16 7 16 16Z" fill="${CONFIG.palette.ui.accent}" />
  <path d="M32 48c0-11 7-20 18-20 0 11-7 20-18 20Z" fill="${CONFIG.palette.ui.accent}" opacity=".75" />
</svg>
`

const faviconPlugin: Plugin = {
  name: 'favicon',
  configureServer(server) {
    server.middlewares.use(`${server.config.base}favicon.svg`, (_request, response) => {
      response.setHeader('Content-Type', 'image/svg+xml')
      response.end(favicon())
    })
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: favicon() })
  },
}

const htmlConfig: Plugin = {
  name: 'html-config',
  transformIndexHtml(html) {
    return html.replace(/%([A-Z_]+)%/g, (match, key: string) => replacements[key] ?? match)
  },
}

// Local dev runs at "/"; builds and preview use "/<repo>/" for GitHub Pages.
export default defineConfig(({ command, isPreview }) => ({
  base:
    process.env.VITE_BASE_PATH ??
    (command === 'build' || isPreview ? `/${repoName}/` : '/'),
  plugins: [react(), htmlConfig, faviconPlugin],
  test: {
    css: { include: [/index\.css/] },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/logic/testing/**', 'src/main.tsx'],
      reporter: ['text', 'html'],
    },
  },
}))
