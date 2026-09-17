import type { NextConfig } from "next";

const devOrigins = (process.env.MIXD_DEV_ORIGINS || "172.20.253.18,*.ngrok-free.app,*.ngrok.io")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Allow HMR requests when the dev server is opened via a LAN IP or ngrok.
  // Production builds do not use this setting.
  allowedDevOrigins: devOrigins,
  turbopack: {
    root: __dirname
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "is2-ssl.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "is3-ssl.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "is4-ssl.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "is5-ssl.mzstatic.com",
      }
    ]
  }
};

export default nextConfig;
