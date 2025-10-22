import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prism from "vite-plugin-prismjs";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    prism({
      languages: [
        "markup",
        "html",
        "xml",
        "svg",
        "rss",
        "css",
        "javascript",
        "arduino",
        "armasm",
        "aspnet",
        "bash",
        "batch",
        "c",
        "cs",
        "cpp",
        "cmake",
        "csv",
        "d",
        "diff",
        "docker",
        "elixir",
        "erlang",
        "fortran",
        "git",
        "go",
        "gradle",
        "graphql",
        "haskell",
        "http",
        "java",
        "json",
        "json5",
        "latex",
        "log",
        "matlab",
        "mongodb",
        "nginx",
        "php",
        "powershell",
        "pug",
        "python",
        "r",
        "jsx",
        "tsx",
        "renpy",
        "ruby",
        "rust",
        "sass",
        "scss",
        "sql",
        "swift",
        "toml",
        "typescript",
        "vim",
        "visual-basic",
        "wasm",
        "yaml",
        "zig",
      ],
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
  build: {
    rolldownOptions: {
      output: {
        // This is needed to avoid the following error:
        // dist/assets/index-BS2y5DZK.js   1,747.08 kB │ gzip: 576.15 kB
        // (!) Some chunks are larger than 500 kB after minification.
        advancedChunks: {
          groups: [
            {
              name: "react-vendor",
              test: /\/node_modules\/(react|react-dom)\//,
            },
            {
              name: "chakra-ui",
              test: /\/node_modules\/@chakra-ui/,
            },
            {
              name: "framer-motion",
              test: /\/node_modules\/framer-motion\//,
            },
            {
              name: "react-query",
              test: /\/node_modules\/@tanstack\/react-query\//,
            },
            {
              name: "react-router",
              test: /\/node_modules\/@tanstack\/react-router\//,
            },
            {
              name: "charts",
              test: /\/node_modules\/recharts\//,
            },
            {
              name: "d3-vendor",
              test: /\/node_modules\/(d3-|victory-)/,
            },
            {
              name: "icons",
              test: /\/node_modules\/(lucide-react|react-icons)\//,
            },
            {
              name: "state",
              test: /\/node_modules\/(immer|use-immer)\//,
            },
          ],
        },
      },
    },
  },
}));
