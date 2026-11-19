import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the pure / fakeable business logic in src/lib
// (Phase 5, §5.1). Tests are hermetic: no database, no network —
// Prisma-shaped fakes are injected through the libraries' existing
// client parameters. Run with `npm test`.
export default defineConfig({
   resolve: {
      alias: {
         "@src": path.resolve(__dirname, "./src"),
      },
   },
   test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      env: {
         // auth.ts refuses to sign tokens without a secret outside
         // development; tests use a dedicated throwaway value.
         JWT_SECRET: "unit-test-secret-not-for-production",
      },
   },
});
