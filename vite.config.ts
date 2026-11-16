import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'evergrow'

// Local dev runs at "/", production builds at "/<repo>/" for GitHub Pages.
export default defineConfig(({ command }) => ({
  base:
    process.env.VITE_BASE_PATH ??
    (command === 'build' ? `/${repoName}/` : '/'),
  plugins: [react()],
}))
