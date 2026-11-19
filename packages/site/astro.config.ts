import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import arraybuffer from "./plugin";

import expressiveCode from "astro-expressive-code";

import tailwind from "@tailwindcss/vite";

import react from "@astrojs/react";

const prodUrl = "https://tristansweeney.com";

// Mirror vercel.json's SPA rewrite so deep links reload in dev/preview too.
const mirrorweaveSpa = {
  name: "mirrorweave-spa-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/mirrorweave\/browse\/.+/.test(req.url.split("?")[0])) {
        req.url = "/mirrorweave/browse/" + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "");
      }
      next();
    });
  },
  configurePreviewServer(server) {
    this.configureServer(server);
  },
};

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
  integrations: [sitemap({ xslURL: "/sitemap.xsl" }), expressiveCode({
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
  }), mdx(), react()],
  vite: {
    plugins: [mirrorweaveSpa, arraybuffer({ include: "**/*.ttf" }), tailwind()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
});