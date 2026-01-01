/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  // Environment variables for API endpoints
  env: {
    NEXT_PUBLIC_TETRA_POW_URL: process.env.NEXT_PUBLIC_TETRA_POW_URL || 'http://localhost:8082',
    NEXT_PUBLIC_DICE_ROLL_URL: process.env.NEXT_PUBLIC_DICE_ROLL_URL || 'http://localhost:8083',
    NEXT_PUBLIC_TREASURY_URL: process.env.NEXT_PUBLIC_TREASURY_URL || 'http://localhost:8080',
    NEXT_PUBLIC_ROSETTA_URL: process.env.NEXT_PUBLIC_ROSETTA_URL || 'http://localhost:8081',
    NEXT_PUBLIC_GUARDIAN_URL: process.env.NEXT_PUBLIC_GUARDIAN_URL || 'http://localhost:8084',
  },

  // Vercel-specific optimizations
  images: {
    domains: [],
    unoptimized: true,
  },
}

module.exports = nextConfig
