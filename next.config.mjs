/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: false,
   allowedDevOrigins: ["192.168.0.105"],
   transpilePackages: [
      "@mui/x-data-grid",
      "@mui/x-data-grid-pro",
      "@mui/x-data-grid-premium",
   ],
};

export default nextConfig;
