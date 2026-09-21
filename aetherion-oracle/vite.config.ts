import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/solana-rpc": {
        target: "https://api.devnet.solana.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/solana-rpc/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_MODE__: JSON.stringify(mode),
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    // Separate .map files bloat dist (~14MB) and slow deploys; omit in prod.
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    // Do not modulepreload heavy chain vendors on every HTML navigation —
    // they only load when a route actually imports them.
    modulePreload: {
      resolveDependencies(filename, deps) {
        return deps.filter(
          (dep) =>
            !dep.includes("solana-vendor") &&
            !dep.includes("viem-vendor") &&
            !dep.includes("pdf-vendor") &&
            !dep.includes("motion-vendor"),
        );
      },
    },
    rollupOptions: {
      output: {
        // Only split packages the entry already depends on. Putting async-only
        // libs (viem/solana/jspdf/framer) into manualChunks causes Rollup to
        // park Vite's __vitePreload helper inside that chunk — then the entry
        // statically imports it and every visitor downloads hundreds of KB.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      "@solana-mobile/wallet-adapter-mobile": path.resolve(
        __dirname,
        "vendor/solana-mobile-wallet-stub/index.js",
      ),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
