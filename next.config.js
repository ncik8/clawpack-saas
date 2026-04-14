/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.linkedin.com',
      },
      {
        protocol: 'https',
        hostname: '**.licdn.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://**.linkedin.com https://**.licdn.com https://pbs.twimg.com https://abs.twimg.com;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig