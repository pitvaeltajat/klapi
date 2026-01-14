import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        gray: {
          50: { value: "#f9fafb" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "bg.body": {
          value: { base: "{colors.gray.50}" },
        },
      },
    },
  },
  globalCss: {
    body: {
      bg: "bg.body",
    },
  },
});
