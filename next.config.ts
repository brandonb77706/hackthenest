import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * This computer's addresses on the local network (like 10.226.224.172), so a
 * phone on the same wifi can use `npm run dev` through the Network address.
 * Without this, Next.js blocks the phone from loading dev scripts and buttons
 * don't work. Dev only; read fresh each time the server starts.
 */
function localNetworkAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    ...localNetworkAddresses(),
    // VS Code port forwarding (Ports panel), e.g. abc123-3000.usw2.devtunnels.ms
    "**.devtunnels.ms",
    // Cloudflare quick tunnels, e.g. random-words.trycloudflare.com
    "*.trycloudflare.com",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
