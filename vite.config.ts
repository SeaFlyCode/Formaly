import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  worker: {
    format: 'es',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Formaly',
        short_name: 'Formaly',
        description:
          "Convertisseur et éditeur de fichiers 100% local : tout le traitement se fait dans votre navigateur, aucun fichier n'est jamais envoyé à un serveur.",
        theme_color: '#c1683f',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Ne précacher que le shell applicatif (JS/CSS/HTML du bundle
        // principal). Les gros chunks lazy-loadés (wasm ONNX runtime,
        // pdf.worker, heic-convert, transformers.web...) ne doivent
        // jamais être téléchargés au premier install : ils sont mis en
        // cache à la demande via runtimeCaching ci-dessous, une fois
        // effectivement utilisés.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: [
          '**/ort-wasm*',
          '**/*.wasm',
          '**/pdf.worker*',
          '**/pdf-to-images*',
          '**/heic-convert*',
          '**/transformers.web*',
          '**/PDFButton*',
          '**/processing.worker*',
          '**/avif_enc*',
          '**/avif_dec*',
          '**/avif-convert*',
          '**/tiff-convert*',
        ],
        // Filet de sécurité : si un gros chunk lazy-loadé échappe aux
        // motifs ci-dessus (renommage, nouvel outil...), le build
        // échoue plutôt que de le précacher silencieusement — signal
        // qu'il faut l'ajouter à globIgnores/runtimeCaching.
        maximumFileSizeToCacheInBytes: 300 * 1024,
        runtimeCaching: [
          {
            // Outils lourds chargés à la demande (modèle IA de
            // suppression de fond, worker PDF.js, conversion HEIC,
            // transformers.js) : mis en cache après le premier
            // téléchargement, puis servis depuis le cache.
            urlPattern: ({ url }) =>
              /ort-wasm|pdf\.worker|pdf-to-images|heic-convert|transformers\.web|PDFButton|processing\.worker|avif_enc|avif_dec|avif-convert|tiff-convert/.test(
                url.pathname,
              ) || url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'formaly-heavy-assets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
