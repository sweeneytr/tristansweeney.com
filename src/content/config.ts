import { z, defineCollection } from 'astro:content';

const credit = z.object({author: z.string(), url: z.string()});

const blog = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      tags: z.array(z.string()),
      description: z.string(),
      pubDate: z.string().transform((str) => new Date(str)),
      imgUrl: image(),
      credit: credit.optional(),
      draft: z.boolean().optional().default(false),
    }),
});

const projects = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      tags: z.array(z.string()),
      description: z.string(),
      pubDate: z.string().transform((str) => new Date(str)),
      imgUrl: image(),
      credit: credit.optional(),
      draft: z.boolean().optional().default(false),
    }),
});

export const collections = {
  blog,
  projects,
};
