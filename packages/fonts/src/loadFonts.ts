import os from "os";
import fs from "fs/promises";
export { default as LocalFont } from "./LocalFont.astro";
export * from "./fonts/index.ts";

export const loadFonts = async (): Promise<
  {
    family: string;
    src: string;
    fontWeight?:
      | "thin"
      | "ultralight"
      | "light"
      | "normal"
      | "medium"
      | "semibold"
      | "bold"
      | "ultrabold"
      | "heavy";
    fontStyle?: "normal" | "italic" | "oblique";
  }[]
> =>
  await Promise.all(
    (
      [
        { family: "Outfit", src: "outfit" },
        { family: "Poppins", src: "Poppins-Regular" },
        {
          family: "Poppins",
          src: "Poppins-Italic",
          fontStyle: "italic",
        },
        {
          family: "Poppins",
          src: "Poppins-LightItalic",
          fontStyle: "italic",
          fontWeight: "light",
        },
        {
          family: "Poppins",
          src: "Poppins-Bold",
          fontWeight: "bold",
        },
        {
          family: "Righteous",
          src: "righteous",
        },
        {
          family: "Sanchez",
          src: "sanchez",
        },
        { family: "DM-Serif", src: "dm-serif" },
      ] as const
    ).map(async ({ family, src, ...rest }) => {
      const path = `${os.tmpdir()}/${src}.ttf`;
      const module = await import(`./fonts/${family}/${src}.ttf`);

      await fs.writeFile(path, module.default);

      return { family, src: path, ...rest };
    }),
  );
