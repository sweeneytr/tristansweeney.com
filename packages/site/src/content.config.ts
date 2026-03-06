import { glob } from "astro/loaders";
import { defineCollection, z, type ImageFunction } from "astro:content";

const PostData = ({ image }: { image: ImageFunction }) => {
  const imageSchema = z.object({
    url: image(),
    credit: z.object({ author: z.string(), url: z.string() }).optional(),
    style: z
      .object({
        "object-fit": z.string().optional(),
        "background-color": z.string().optional(),
      })
      .optional(),
  });

  return z.object({
    title: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    pubDate: z.string().transform((str) => new Date(str)),
    image: imageSchema.optional(),
    draft: z.boolean().optional().default(false),
  });
};

export type PostData = z.infer<ReturnType<typeof PostData>>;

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
