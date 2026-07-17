import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pzy2000.gof2",
  appName: "GOF2 by pzy",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  android: {
    backgroundColor: "#020713"
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false
    }
  }
};

export default config;
