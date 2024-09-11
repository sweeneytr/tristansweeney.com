import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import UnoCSS from "unocss/astro";
import mdx from "@astrojs/mdx";
import arraybuffer from "./plugin";

import expressiveCode from "astro-expressive-code";

const prodUrl = "https://sweeneytr-github-io.vercel.app/";

// https://astro.build/config
export default defineConfig({
  // used to generate images
  site:
    process.env.VERCEL_ENV === "production" && prodUrl
      ? prodUrl
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/`
        : "http://localhost:4321/",
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
          frameBoxShadowCssValue: "7px 7px 0 rgb(0 0 0 / 1);",
        },
        borderWidth: "3px",
        borderColor: "black",
      },
    }),
    mdx(),
  ],
  vite: {
    plugins: [arraybuffer({ include: "public/fonts/*.ttf" })],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
});
