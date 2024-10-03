import type { APIRoute } from "astro";
import ReactPDF from "@react-pdf/renderer";
import { Resume } from "@components/pdf/resume";
import os from "os";
import fs from "fs/promises";
import { loadFonts } from "@components/pdf/fonts";

export const GET: APIRoute = async ({ site }) => {
  await loadFonts(site);
  await ReactPDF.render(Resume(), `${os.tmpdir()}/resume.pdf`);

  return new Response(await fs.readFile(`${os.tmpdir()}/resume.pdf`), {
    headers: {
      "content-type": "application/pdf",
    },
  });
};
