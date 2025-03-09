const { withSuperjson } = require("next-superjson");

const nextConfig = {
  output: "standalone",
};

module.exports = withSuperjson()(nextConfig);
