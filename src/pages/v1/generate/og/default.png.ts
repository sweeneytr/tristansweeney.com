import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";
import { html as toReactElement } from "satori-html";

const fontFile = await fetch(
  "https://og-playground.vercel.app/inter-latin-ext-700-normal.woff"
);

const fontData: ArrayBuffer = await fontFile.arrayBuffer();

const height = 630;
const width = 1200;

export const GET: APIRoute = async () => {
  const link = "https://tristansweeney.com";
  const html = toReactElement(`
  <div style="background-color: #c084fc; display: flex; flex-direction: column; height: 100%; padding: 3rem; width: 100%">
    <div style="display:flex; height: 100%; width: 100%; background-color: white; border: 6px solid black; border-radius: 0.5rem; padding: 2rem; filter: drop-shadow(6px 6px 0 rgb(0 0 0 / 1)); box-shadow: 8px 8px 0 black;">
      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; filter: drop-shadow()">
        <div style="display: flex; flex-direction: column;">  
          <p style="font-size: 58px; margin: 0; ">Tristan Sweeney</p>
          <p style="font-size: 38px; margin: 0; margin-bottom: 0.75 rem;">Software engineer for humans</p>
          <p style="font-size: 38px;">Brought to you by himself</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: -2rem;">
          <p style="font-size: 32px">${link}</p>
          <img src="https://media.licdn.com/dms/image/v2/D4E03AQEaDQ0_v3CrDA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1681700280055?e=1730937600&v=beta&t=NGnuiydWpJLNhqQNs_n-EHzhU0lGqr7srokC6Bcapw4" width="200px" height="200px" style="border: 3px solid black; border-radius: 0.5rem; box-shadow: 3px 3px 0 black;" />
        </div>
      </div>
    </div>
  </div>
  `);

  const svg = await satori(html, {
    fonts: [
      {
        name: "Inter Latin",
        data: fontData,
        style: "normal",
      },
    ],

    height,
    width,
  });

  const opts: ResvgRenderOptions = {
    fitTo: {
      mode: "width",
      value: width,
    },
  };
  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "content-type": "image/png",
    },
  });
};
