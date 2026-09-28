import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `page.dev.tsx` routes (the stills lab) exist only in development.
  pageExtensions: process.env.NODE_ENV === "development" ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
  images: {
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
