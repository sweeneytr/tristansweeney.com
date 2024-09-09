import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori, { type Font } from "satori";

import { OpenGraphCard } from "@components/opengraph/card";

import outfit from "@public/fonts/outfit.ttf";
import poppins from "@public/fonts/poppins.ttf";
import righteous from "@public/fonts/righteous.ttf";
import sanchez from "@public/fonts/sanchez.ttf";
import serif from "@public/fonts/dm-serif.ttf";

const loadFont = async (url: string) => {
  const fontFile = await fetch(url);
  return await fontFile.arrayBuffer();
};

const loadFonts = async (site: string): Promise<Font[]> => [
  {
    name: "Inter Latin",
    data: await loadFont(
      "https://og-playground.vercel.app/inter-latin-ext-700-normal.woff"
    ),
    style: "normal",
  },
  {
    name: "outfit",
    data: outfit,
    style: "normal",
  },
  {
    name: "poppins",
    data: poppins,
    style: "normal",
  },
  {
    name: "righteous",
    data: righteous,
    style: "normal",
  },
  {
    name: "sanchez",
    data: sanchez,
    style: "normal",
  },
  {
    name: "dm-serif",
    data: serif,
    style: "normal",
  },
];

const height = 630;
const width = 1200;

export const GET: APIRoute = async ({ site }) => {
  const html = OpenGraphCard();

  const svg = await satori(html, {
    fonts: await loadFonts(site?.toString() ?? ""),
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
