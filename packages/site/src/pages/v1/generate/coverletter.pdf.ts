import { CoverLetter } from "#components/pdf/coverletter.tsx";
import { loadFonts } from "@aelar/fonts";
import ReactPDF from "@react-pdf/renderer";
import type { APIRoute } from "astro";
import fs from "fs/promises";
import os from "os";

export const GET: APIRoute = async ({ site }) => {
  if (site) {
    (await loadFonts()).forEach(ReactPDF.Font.register);
  }

  await ReactPDF.render(CoverLetter(), `${os.tmpdir()}/coverletter.pdf`);

  return new Response(await fs.readFile(`${os.tmpdir()}/coverletter.pdf`), {
    headers: {
      "content-type": "application/pdf",
    },
  });
};
