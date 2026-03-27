import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori, { type Font } from "satori";

import { OpenGraphCard } from "#components/opengraph/card.tsx";

import { dmSerif, outfit, poppins, righteous, sanchez } from "@aelar/fonts";
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
    data: dmSerif,
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

export function toArrayBuffer(bufferLike: Buffer<ArrayBufferLike>) {
  // Check if it is already an ArrayBuffer and meets your specific needs (e.g., resizability)
  if (bufferLike instanceof ArrayBuffer) {
    return bufferLike;
  }

  // If it's a SharedArrayBuffer or a different ArrayBuffer-like object, create a new ArrayBuffer copy.
  // Using a Uint8Array view is an efficient way to copy the underlying bytes.
  const uint8View = new Uint8Array(bufferLike);
  const arrayBuffer = new ArrayBuffer(uint8View.byteLength);
  const arrayBufferView = new Uint8Array(arrayBuffer);
  arrayBufferView.set(uint8View);

  return arrayBuffer;
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

  return new Response(
    toArrayBuffer(await render({ html, width: 1200, height: 630 })),
    {
      headers: {
        "content-type": "image/png",
      },
    },
  );
};
