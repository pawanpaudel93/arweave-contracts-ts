import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["contracts/contract.ts"],
  bundle: true,
  outfile: "dist/contract.js",
});
