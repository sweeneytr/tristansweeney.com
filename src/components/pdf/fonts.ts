import { Font } from "@react-pdf/renderer";

export const loadFonts = async (site: URL) => {
  Font.clear();
  (
    [
      { family: "Outfit", filename: "outfit.ttf", src: "fonts/outfit.ttf" },
      { family: "Poppins", src: "fonts/Poppins/Poppins-Regular.ttf" },
      {
        family: "Poppins",
        src: "fonts/Poppins/Poppins-Italic.ttf",
        fontStyle: "italic",
      },
      {
        family: "Poppins",
        src: "fonts/Poppins/Poppins-LightItalic.ttf",
        fontStyle: "italic",
        fontWeight: "light",
      },
      {
        family: "Poppins",
        src: "fonts/Poppins/Poppins-Bold.ttf",
        fontWeight: "bold",
      },
      {
        family: "Righteous",
        src: "fonts/righteous.ttf",
      },
      {
        family: "Sanchez",
        src: "fonts/sanchez.ttf",
      },
      { family: "Serif", src: "fonts/dm-serif.ttf" },
    ] as const
  )
    .map(({ src, ...rest }) => {
      const path = `${site}/${src}`;
      console.log(path);
      return { src: path, ...rest };
    })
    .forEach((font) => Font.register(font));
};
