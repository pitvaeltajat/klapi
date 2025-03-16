import { withSuperjson } from "next-superjson";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    dirs: [
      "pages",
      "components",
      "lib",
      "hooks",
      "utils",
      "styles",
      "types",
      "theme",
      "public",
      "next-env.d.ts",
    ],
  },
};

export default withSuperjson()(nextConfig);
