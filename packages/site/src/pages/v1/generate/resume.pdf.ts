import { Resume } from "#components/pdf/resume.tsx";
import { loadFonts } from "@aelar/fonts";
import ReactPDF from "@react-pdf/renderer";
import type { APIRoute } from "astro";
import fs from "fs/promises";
import os from "os";

export const GET: APIRoute = async ({ site }) => {
  (await loadFonts()).forEach(ReactPDF.Font.register);

  await ReactPDF.render(Resume(), `${os.tmpdir()}/resume.pdf`);

  return new Response(await fs.readFile(`${os.tmpdir()}/resume.pdf`), {
    headers: {
      "content-type": "application/pdf",
      "Content-Disposition": "attachment; filename=TristanSweeneyResume.pdf",
    },
  });
};
