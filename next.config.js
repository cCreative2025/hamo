/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    };
    return config;
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'konva', 'react-konva'],
  },
};

module.exports = nextConfig;
