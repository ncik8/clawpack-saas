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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://**.linkedin.com https://**.licdn.com https://pbs.twimg.com https://abs.twimg.com; connect-src 'self' https://dcyifihwvqxtpypphpef.supabase.co https://*.supabase.co https://api.twitter.com https://upload.twitter.com https://video.bsky.app https://bsky.social https://api.linkedin.com https://*.atproto.com https://graph.facebook.com https://graph.instagram.com https://*.facebook.com; frame-src 'self' https://*.supabase.co;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig