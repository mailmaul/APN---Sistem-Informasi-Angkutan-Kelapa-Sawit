import type { NextConfig } from "next";

// Served under https://mauldev.my.id/apn behind nginx. `next/link` and
// router.push() auto-prepend this; raw fetch()/<a href>/<img src> do NOT —
// use withBasePath() from @/lib/base-path for those.
//
// NOTE: never add `output: "standalone"` here — pm2 runs `next start`, and
// mixing the two breaks request context (nulls out the session).
const nextConfig: NextConfig = {
  basePath: "/apn",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/apn",
  },
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
