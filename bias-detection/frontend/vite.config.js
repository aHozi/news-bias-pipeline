import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { createReadStream, existsSync } from 'fs'

const csvFiles = [
  'popularity_people_metrics.csv',
  'political_mentions.csv',
  'political_entity_metrics.csv',
  'party_source_metrics.csv',
]

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-csv',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const fileName = req.url.slice(1);
          if (csvFiles.includes(fileName)) {
            const filePath = resolve(__dirname, '../data/03_primary', fileName);
            if (existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/csv');
              createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
      async writeBundle() {
        const sourceDir = resolve(__dirname, '../data/03_primary')
        const destDir = resolve(__dirname, 'dist')
        await mkdir(destDir, { recursive: true })

        try {
          await Promise.all(
            csvFiles.map((fileName) =>
              copyFile(resolve(sourceDir, fileName), resolve(destDir, fileName))
            )
          )
          console.log('✓ Metrics CSV files copied to dist/')
        } catch (err) {
          console.warn('⚠ Metrics CSV file not found. Run pipeline first: kedro run')
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
