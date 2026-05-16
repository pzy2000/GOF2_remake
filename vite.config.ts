import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function hasPath(id: string, path: string): boolean {
  return id.indexOf(path) !== -1;
}

function economyProxyTarget(): string {
  const host = process.env.GOF2_ECONOMY_HOST ?? "127.0.0.1";
  const proxyHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
  const port = process.env.GOF2_ECONOMY_PORT ?? "19777";
  return `http://${proxyHost}:${port}`;
}

function multiplayerProxyTarget(): string {
  const host = process.env.GOF2_MULTIPLAYER_HOST ?? "127.0.0.1";
  const proxyHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
  const port = process.env.GOF2_MULTIPLAYER_PORT ?? "19778";
  return `http://${proxyHost}:${port}`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");

  return {
    base: env.VITE_BASE_PATH ?? "/",
    plugins: [react()],
    server: {
      proxy: {
        "/api/economy": {
          target: economyProxyTarget(),
          changeOrigin: true
        },
        "/api/multiplayer": {
          target: multiplayerProxyTarget(),
          changeOrigin: true,
          ws: true
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!hasPath(id, "node_modules")) return undefined;
            if (hasPath(id, "/react/") || hasPath(id, "/react-dom/") || hasPath(id, "/scheduler/")) return "react-vendor";
            if (hasPath(id, "/@react-three/fiber/")) return "r3f-vendor";
            if (hasPath(id, "/@react-three/drei/")) return "drei-vendor";
            if (hasPath(id, "/three/")) return "three-vendor";
            if (hasPath(id, "/zustand/")) return "state-vendor";
            return "vendor";
          }
        }
      }
    }
  };
});
