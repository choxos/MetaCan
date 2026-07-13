/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Base path for subdirectory deployment (e.g., /metacan in production)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'openscience.xera.ac' },
    ],
  },

  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'openscience.xera.ac'],
    },
  },

  // Security headers
  async headers() {
    // Next.js dev mode (react-refresh / HMR) evaluates code via eval(), so
    // 'unsafe-eval' is required for `next dev` to run. In production it is
    // stripped; the prod bundle does not use eval.
    const devEval = process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' retained for Next's inline bootstrap and the
              // JSON-LD blocks; nonce-based hardening is a tracked follow-up.
              // No analytics is loaded, so no third-party script origin is
              // allowed here (the tracker's CSP permits googletagmanager; this
              // app ships no GA, so that allowance is deliberately dropped).
              `script-src 'self' 'unsafe-inline'${devEval}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              // The explorer reads committed JSON, but the sources it maps are
              // OpenAlex and Erudit; both are permitted so a live query path can
              // be added without loosening the policy later.
              "connect-src 'self' https://api.openalex.org https://oai.erudit.org https://doi.org",
              "frame-src 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
