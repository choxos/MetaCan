/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /analytics became /landscape when the label landscape landed on top of the
  // frame analytics. Old links (and the French twins) keep working forever.
  async redirects() {
    return [
      { source: '/analytics', destination: '/landscape', permanent: true },
      { source: '/fr/analytics', destination: '/fr/landscape', permanent: true },
    ]
  },
}
