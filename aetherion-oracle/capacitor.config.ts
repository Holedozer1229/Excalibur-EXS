import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.79f908b3ebce42e1846122cff5d3c167",
  appName: "aetherion-oracle-arcane",
  webDir: "dist",
  server: {
    url: "https://79f908b3-ebce-42e1-8461-22cff5d3c167.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#000000",
  },
};

export default config;
