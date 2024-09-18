import { z, defineCollection, type ImageFunction } from "astro:content";

const credit = z.object({ author: z.string(), url: z.string() });
const schema = ({ image }: { image: ImageFunction }) =>
  z.object({
    title: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    pubDate: z.string().transform((str) => new Date(str)),
    imgUrl: image(),
    image: z
      .object({
        style: z.object({}).passthrough(),
      })
      .optional(),
    credit: credit.optional(),
    draft: z.boolean().optional().default(false),
  });

const blog = defineCollection({ schema });

const projects = defineCollection({ schema });

export const collections = {
  blog,
  projects,
};
