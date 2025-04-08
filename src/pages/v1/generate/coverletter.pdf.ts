import type { APIRoute } from "astro";
import ReactPDF from "@react-pdf/renderer";
import os from "os";
import fs from "fs/promises";
import { loadFonts } from "@components/pdf/fonts";
import { CoverLetter } from "@components/pdf/coverletter";

export const GET: APIRoute = async ({ site }) => {
  if (site) {
    await loadFonts(site);
  }

  await ReactPDF.render(CoverLetter(), `${os.tmpdir()}/coverletter.pdf`);

  return new Response(await fs.readFile(`${os.tmpdir()}/coverletter.pdf`), {
    headers: {
      "content-type": "application/pdf",
    },
  });
};
