import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Louvy',
    short_name: 'Louvy',
    description: 'Plataforma de escalas de louvor em tempo real.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f0e8',
    theme_color: '#7a1f3e',
    icons: [],
  };
}
