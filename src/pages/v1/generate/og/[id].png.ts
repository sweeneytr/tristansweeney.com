import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { OpenGraphCard } from "@components/opengraph/card";
import { render } from "./default.png";

const posts = await getCollection("blog");

export function getStaticPaths() {
  return posts.map((post) => ({
    params: { id: post.id },
    props: { title: post.data.title, description: post.data.description },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  const title = props.title.trim() ?? "Blogpost";
  const description = props.description ?? null;

  const html = OpenGraphCard({
    title: "Tristan Sweeney",
    subtitle: title,
    description,
    link: "https://tristansweeney.com",
  });

  return new Response(await render({ html, width: 1200, height: 630 }), {
    headers: {
      "content-type": "image/png",
    },
  });
};
