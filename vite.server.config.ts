import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist-server",
    ssr: "server/economyServer.ts",
    target: "node20",
    rollupOptions: {
      output: {
        entryFileNames: "economy-server.mjs",
        format: "es"
      }
    }
  }
});
