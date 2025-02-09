import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori, { type Font } from "satori";

import { OpenGraphCard } from "@components/opengraph/card";

import outfit from "@public/fonts/outfit.ttf";
import poppins from "@public/fonts/poppins.ttf";
import righteous from "@public/fonts/righteous.ttf";
import sanchez from "@public/fonts/sanchez.ttf";
import serif from "@public/fonts/dm-serif.ttf";
import type { ReactNode } from "react";

const loadFont = async (url: string) => {
  const fontFile = await fetch(url);
  return await fontFile.arrayBuffer();
};

const fonts: Font[] = [
  {
    name: "Inter Latin",
    data: await loadFont(
      "https://og-playground.vercel.app/inter-latin-ext-700-normal.woff",
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

namespace render {
  export type Props = {
    html: ReactNode;
    width: number;
    height: number;
  };
}

export const render = async ({ html, width, height }: render.Props) => {
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
  return pngData.asPng();
};

export const GET: APIRoute = async () => {
  const html = OpenGraphCard({
    title: "Tristan Sweeney",
    subtitle: "Software engineer for humans",
    link: "https://tristansweeney.com",
    description:
      "Bringing together developers, by bringing together technology",
  });

  return new Response(await render({ html, width: 1200, height: 630 }), {
    headers: {
      "content-type": "image/png",
    },
  });
};
