/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
   transpilePackages: [
      "@mui/x-data-grid",
      "@mui/x-data-grid-pro",
      "@mui/x-data-grid-premium",
   ],
   // P4-13: baseline security headers on every response. Deliberately
   // minimal — no Content-Security-Policy (an untested CSP risks
   // breaking the app's inline styles/scripts) and no HSTS (that is
   // a deployment/TLS decision for the host, not the app).
   async headers() {
      return [
         {
            source: "/:path*",
            headers: [
               { key: "X-Content-Type-Options", value: "nosniff" },
               {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
               },
               { key: "X-Frame-Options", value: "SAMEORIGIN" },
            ],
         },
      ];
   },
};

export default nextConfig;
