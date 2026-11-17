import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// Keep the app config Node-safe: no browser, React or three imports in that file.
import { CONFIG } from './src/config/evergrow.config.ts'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'evergrow'

const replacements: Record<string, string> = {
  APP_NAME: CONFIG.appName,
  THEME_COLOR: CONFIG.palette.background.day,
}

const htmlConfig: Plugin = {
  name: 'html-config',
  transformIndexHtml(html) {
    return html.replace(/%([A-Z_]+)%/g, (match, key: string) => replacements[key] ?? match)
  },
}

// Local dev runs at "/", production builds at "/<repo>/" for GitHub Pages.
export default defineConfig(({ command }) => ({
  base:
    process.env.VITE_BASE_PATH ??
    (command === 'build' ? `/${repoName}/` : '/'),
  plugins: [react(), htmlConfig],
}))
