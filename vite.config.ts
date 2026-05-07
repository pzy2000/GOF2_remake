import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function hasPath(id: string, path: string): boolean {
  return id.indexOf(path) !== -1;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");

  return {
    base: env.VITE_BASE_PATH ?? "/",
    plugins: [react()],
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
