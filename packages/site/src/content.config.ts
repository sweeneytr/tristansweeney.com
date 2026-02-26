import { z, defineCollection, type ImageFunction } from "astro:content";
import { glob } from "astro/loaders";

const credit = z.object({ author: z.string(), url: z.string() });

const schema = ({ image }: { image: ImageFunction }) => {
  const imageSchema = z.object({
    url: image(),
    credit: credit.optional(),
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

export type PostData = z.infer<ReturnType<typeof schema>>;

const blog = defineCollection({
  schema,
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
});

const projects = defineCollection({
  schema,
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
});

export const collections = {
  blog,
  projects,
};
