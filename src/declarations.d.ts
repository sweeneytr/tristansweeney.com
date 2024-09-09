declare module "*.ttf" {
  // The file is imported as a Node.js Buffer, which is a Uint8Array in TypeScript
  const content: Buffer;
  export default content;
}
