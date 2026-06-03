import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [svelte()],
  test: {
    // vitest (decision D8): runs the pure lib/ extractions in Node, no browser.
    environment: 'node',
    include: ['src/**/*.{test,spec}.js'],
  },
})
