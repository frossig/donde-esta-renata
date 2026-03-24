import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Donde está Renata',
    short_name: 'Renata ✈️',
    description: 'Siguiendo a Renata por Europa',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf6f1',
    theme_color: '#c4956a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
