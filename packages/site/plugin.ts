import { readFileSync } from "node:fs";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import type { Plugin } from "vite";

const template = (base64: string) => `
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; ++i) { bytes[i] = binary.charCodeAt(i); }
    return Buffer.from(bytes.buffer);
}
export default base64ToBuffer("${base64}");
`;

export default function arraybuffer({
  include,
  exclude,
}: {
  include?: FilterPattern;
  exclude?: FilterPattern;
}): Plugin {
  const filter = createFilter(include, exclude);

  return {
    name: "arraybuffer",

    transform(_, id) {
      if (!filter(id)) {
        return null;
      }

      const base64 = readFileSync(id, { encoding: "base64" });
      return {
        code: template(base64),
        map: { mappings: "" },
      };
    },
  };
}
