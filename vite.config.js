import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (
    env.VITE_API_PROXY_TARGET ||
    "https://web-production-0f6b5.up.railway.app"
  ).replace(/\/$/, "");
  const normalizedTarget = proxyTarget.replace(/\/api\/v1$/, "");

  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      sourcemap: false,
      // Raise the warning threshold — recharts alone is 552 kB and is already split.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Heavy charting library — loaded only when charts are rendered.
            if (id.includes("/node_modules/recharts") ||
                id.includes("/node_modules/d3-") ||
                id.includes("/node_modules/d3/") ||
                id.includes("/node_modules/victory")) {
              return "recharts";
            }
            // React runtime — shared between public and CMS bundles.
            if (id.includes("/node_modules/react-dom") || id.includes("/node_modules/react/")) {
              return "react";
            }
            // CMS — only downloaded when the user navigates to /cms.
            // With React.lazy in App.jsx this chunk is already auto-split, but
            // naming it keeps the output predictable.
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        "/api/v1": {
          target: normalizedTarget,
          changeOrigin: true,
          secure: !normalizedTarget.startsWith("http://"),
        },
      },
    },
  };
});
