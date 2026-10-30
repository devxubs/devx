/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
   transpilePackages: [
      "@mui/x-data-grid",
      "@mui/x-data-grid-pro",
      "@mui/x-data-grid-premium",
   ],
};

export default nextConfig;
