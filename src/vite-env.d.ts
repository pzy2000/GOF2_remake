/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PLATFORM?: "android" | "web";
  readonly VITE_ECONOMY_STATIC_FALLBACK?: string;
  readonly VITE_MULTIPLAYER_STATIC_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
