const { withSuperjson } = require("next-superjson");

const nextConfig = {
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

module.exports = withSuperjson()(nextConfig);
