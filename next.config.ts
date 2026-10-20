import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
