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
      {
        protocol: 'https',
        hostname: '**.twimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.twitter.com',
      },
    ],
  },
}

module.exports = nextConfig
