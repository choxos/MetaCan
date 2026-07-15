/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development'
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? ' ws: http: https:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  // /analytics became /landscape when the label landscape landed on top of the
  // frame analytics. Old links (and the French twins) keep working forever.
  async redirects() {
    return [
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
      { source: '/analytics', destination: '/landscape', permanent: true },
      { source: '/fr/analytics', destination: '/fr/landscape', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/en' },
        { source: '/about', destination: '/en/about' },
        { source: '/api-docs', destination: '/en/api-docs' },
        { source: '/findings', destination: '/en/findings' },
        { source: '/landscape', destination: '/en/landscape' },
        { source: '/recent', destination: '/en/recent' },
        { source: '/recent/:path*', destination: '/en/recent/:path*' },
        { source: '/screen', destination: '/en/screen' },
        { source: '/works', destination: '/en/works' },
        { source: '/works/:path*', destination: '/en/works/:path*' },
        { source: '/q/:path*', destination: '/en/q/:path*' },
      ],
    }
  },
}
