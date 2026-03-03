import { z } from "zod";

export const PostData = ({ image }: { image: z.ZodString }) => {
  const imageSchema = z.object({
    url: z.string(),
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
