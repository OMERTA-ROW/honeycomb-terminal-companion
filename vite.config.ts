// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: { __HC_BUILD__: JSON.stringify(new Date().toISOString()) },
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false, // static public/manifest.webmanifest is the single source
        workbox: {
          // Shell only: hashed same-origin JS/CSS/fonts/icons. No HTML, no API, no server functions.
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,woff2,png,ico,svg}"],
          navigateFallback: null,
          skipWaiting: false,
          clientsClaim: false,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Navigations: always network first; signed-in and data pages never cached.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !/^\/(~oauth|account|transfer|reset-password|workspace|terminal|api|_serverFn)/.test(url.pathname),
              handler: "NetworkFirst",
              options: { cacheName: "hc-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 8 } },
            },
          ],
        },
      }),
    ],
  },
});
