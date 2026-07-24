import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    // map-vendor (maplibre-gl + deck.gl) is inherently large; it's split into
    // its own cacheable chunk below so app-code changes don't bust its cache.
    chunkSizeWarningLimit: 1800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'map-vendor', test: /node_modules\/(maplibre-gl|@deck\.gl)/ },
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|scheduler)/ },
          ],
        },
      },
    },
  },
})
