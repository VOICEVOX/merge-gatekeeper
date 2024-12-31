import * as rolldown from "rolldown";

await rolldown.build({
  input: "src/index.ts",
  platform: "node",
  output: {
    dir: "dist",
    minify: true,
  },
  treeshake: true,
});
