import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist-server",
    ssr: true,
    target: "node20",
    rollupOptions: {
      input: {
        "economy-server": "server/economyServer.ts",
        "multiplayer-server": "server/multiplayerServer.ts"
      },
      output: {
        entryFileNames: "[name].mjs",
        format: "es"
      }
    }
  }
});
