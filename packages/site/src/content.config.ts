import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { PostData } from "posts";

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
