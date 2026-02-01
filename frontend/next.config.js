/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Set absolute root path to silence warning
    root: path.resolve(__dirname, '..'),
  },
  
  // Webpack fallback (only used if --webpack flag is passed)
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ignore optional peer dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
        'pino-pretty': 'commonjs pino-pretty',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
