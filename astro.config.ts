import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import arraybuffer from "./plugin";

import expressiveCode from "astro-expressive-code";

import tailwind from "@tailwindcss/vite";

const prodUrl = "https://tristansweeney.com";

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
    sitemap({ xslURL: "/sitemap.xsl" }),
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
    plugins: [arraybuffer({ include: "**/*.ttf" }), tailwind()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
});
