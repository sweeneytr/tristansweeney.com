import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori, { type Font } from "satori";

import config from "astro.config";
import { OpenGraphCard } from "@components/opengraph/card";

const loadFont = async (url: string) => {
  const fontFile = await fetch(url);
  return await fontFile.arrayBuffer();
};

const fonts: Font[] = [
  {
    name: "Inter Latin",
    data: await loadFont(
      "https://og-playground.vercel.app/inter-latin-ext-700-normal.woff"
    ),
    style: "normal",
  },
  {
    name: "outfit",
    data: await loadFont(`${config.site}/public/fonts/outfit.ttf`),
    style: "normal",
  },
  {
    name: "poppins",
    data: await loadFont(`${config.site}/public/fonts/poppins.ttf`),
    style: "normal",
  },
  {
    name: "righteous",
    data: await loadFont(`${config.site}/public/fonts/righteous.ttf`),
    style: "normal",
  },
  {
    name: "sanchez",
    data: await loadFont(`${config.site}/public/fonts/sanchez.ttf`),
    style: "normal",
  },
  {
    name: "dm-serif",
    data: await loadFont(`${config.site}/public/fonts/dm-serif.ttf`),
    style: "normal",
  },
];

const height = 630;
const width = 1200;

export const GET: APIRoute = async () => {
  const html = OpenGraphCard();
  const svg = await satori(html, {
    fonts,
    height,
    width,
  });

  const opts: ResvgRenderOptions = {
    fitTo: {
      mode: "width",
      value: width,
    },
  };
  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "content-type": "image/png",
    },
  });
};
