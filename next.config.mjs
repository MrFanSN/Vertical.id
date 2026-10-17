import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Klien Turso memakai modul native: jangan di-bundle, biarkan dimuat apa adanya oleh Node.
  serverExternalPackages: ['@libsql/client', 'libsql'],
  // Tetapkan root proyek agar lockfile lain di folder induk tidak ikut terbaca.
  turbopack: { root },
};
export default nextConfig;
