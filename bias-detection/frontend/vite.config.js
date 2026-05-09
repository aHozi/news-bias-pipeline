import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFile } from 'fs/promises'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-csv',
      async writeBundle() {
        try {
          const source = resolve(__dirname, '../data/03_primary/popularity_people_metrics.csv')
          const dest = resolve(__dirname, 'dist/popularity_people_metrics.csv')
          await copyFile(source, dest)
          console.log('✓ CSV copied to dist/')
        } catch (err) {
          console.warn('⚠ CSV file not found. Run pipeline first: kedro run --pipeline=popularity_metrics')
        }
      }
    }
  ],
  server: {
    port: 3000,
  },
  preview: {
    port: 3333,
    host: '0.0.0.0',
    allowedHosts: ['popularity.oxa.al']
  }
})

