import type { APIRoute } from "astro";

const getRobotsTxt = (site: URL) => `
User-agent: *
Allow: /

Host: ${site.href}
Sitemap: ${new URL("sitemap-index.xml", site).href}
`;

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("Expected site for robots.txt!");
  }
  return new Response(getRobotsTxt(site));
};
