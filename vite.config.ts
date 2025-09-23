import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prism from "vite-plugin-prismjs";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    prism({
      languages: "all",
      plugins: ["line-numbers"],
      theme: "okaidia",
      css: true,
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["server/**", "target/**"],
    },
    fs: {
      // Prevent Vite from serving files from the target directory
      strict: true,
      allow: ["."],
      exclude: ["target"],
    },
  },
  optimizeDeps: {
    // Exclude problematic modules that use top-level await
    exclude: ["bson"],
  },
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
}));
