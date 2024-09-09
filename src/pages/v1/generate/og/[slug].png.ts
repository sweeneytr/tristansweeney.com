import { BlogCard } from "@components/opengraph/blogCard";
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";

const fontFile = await fetch(
  "https://og-playground.vercel.app/inter-latin-ext-700-normal.woff"
);
const fontData: ArrayBuffer = await fontFile.arrayBuffer();

const height = 630;
const width = 1200;

const posts = await getCollection("blog");

export function getStaticPaths() {
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { title: post.data.title, description: post.data.description },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  const title = props.title.trim() ?? "Blogpost";
  const description = props.description ?? null;

  const svg = await satori(BlogCard({ title, description }), {
    fonts: [
      {
        name: "Inter Latin",
        data: fontData,
        style: "normal",
      },
    ],
    height,
    width,
  });

  const opts: ResvgRenderOptions = {
    fitTo: {
      mode: "width", // If you need to change the size
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
