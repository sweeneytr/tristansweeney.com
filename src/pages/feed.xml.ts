import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const blog = await getCollection("blog");
  return rss({
    title: "Tristan Sweeney's Blog",
    description: "I write code. Sometimes it's good.",
    stylesheet: "/rss.xsl",
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
    customData: "<language>en-us</language>",
    canonicalUrl: "https://tristansweeney.com",
  });
}
