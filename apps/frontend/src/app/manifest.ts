import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KORUS',
    short_name: 'KORUS',
    description: 'KORUS. Tudo em harmonia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#121212',
    icons: [
      {
        src: '/brand/korus-app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/korus-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/brand/korus-app-icon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  };
}
