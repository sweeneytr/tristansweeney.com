import { z, defineCollection, type ImageFunction } from "astro:content";

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

const blog = defineCollection({ schema });

const projects = defineCollection({ schema });

export const collections = {
  blog,
  projects,
};
