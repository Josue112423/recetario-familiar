/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nskocjbxijbcfrvbnvfc.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
