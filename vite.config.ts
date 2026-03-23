import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "https://dentis-univ-api.nesterenkovasil9.workers.dev";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/proxy-api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/proxy-api/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes(`"use client"`)) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "react-core";
            return "vendor";
          },
        },
      },
    },
  };
});
