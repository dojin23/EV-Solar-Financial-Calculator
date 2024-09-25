/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
}

if (process.env.NODE_ENV === 'production') {
  nextConfig.basePath = '/ev-solar-calculator'
  nextConfig.assetPrefix = '/ev-solar-calculator/'
}

module.exports = nextConfig
