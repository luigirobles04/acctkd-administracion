/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['exceljs'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'chart.js'],
  },
}

export default nextConfig
