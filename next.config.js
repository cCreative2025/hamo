const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Fail the build on type errors — prior value was `true` which hid them.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Keep ESLint off build path to avoid lint churn blocking deploys;
    // lint is expected to run in CI separately.
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
