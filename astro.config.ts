import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import UnoCSS from "unocss/astro";
import mdx from "@astrojs/mdx";

import expressiveCode from "astro-expressive-code";

// https://astro.build/config
export default defineConfig({
  // used to generate images
  site:
    process.env.VERCEL_ENV === "production"
      ? "https://tristansweeney.com/"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/`
        : "https://localhost:3000/",
  trailingSlash: "ignore",
  integrations: [
    sitemap(),
    UnoCSS({
      injectReset: true,
    }),
    expressiveCode({
      themes: ["github-light-high-contrast"],
      styleOverrides: {
        // You can optionally override the plugin's default styles here
        frames: {
          shadowColor: "red",
          frameBoxShadowCssValue: "7px 7px 0 rgb(0 0 0 / 1);"
        },
        borderWidth: "3px",
        borderColor: "black",
        
      },
    }),
    mdx(),
  ],
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
});
