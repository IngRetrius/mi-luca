import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Sin la cabecera x-powered-by: no hace falta anunciar el framework.
  poweredByHeader: false,
  // Los paquetes internos se consumen como código TypeScript (sin paso de compilación propio).
  transpilePackages: [
    '@miluca/db',
    '@miluca/domain',
    '@miluca/engine',
    '@miluca/exporters',
    '@miluca/i18n',
    '@miluca/ui',
  ],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
