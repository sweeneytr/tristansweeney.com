import { PostData } from "@aelar/posts";
import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

const blog = defineCollection({
  schema: PostData,
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
});

const projects = defineCollection({
  schema: PostData,
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
});

export const collections = {
  blog,
  projects,
};
