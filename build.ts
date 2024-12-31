import fs from "node:fs/promises";
import * as rolldown from "rolldown";

const output = await rolldown.build({
  input: "src/index.ts",
  platform: "node",
  output: {
    minify: true,
  },
  treeshake: true,
  write: false,
});

const isCheck = process.argv.includes("--check");

const mainFile = output.output.find((file) => file.fileName === "index.js");
if (!mainFile) {
  throw new Error("index.js not found");
}
if (mainFile.type !== "chunk") {
  throw new Error("index.js is not a chunk");
}

const outputPath = `${import.meta.dirname}/dist/index.js`;
if (isCheck) {
  const expected = await fs.readFile(outputPath, "utf-8");
  if (mainFile.code !== expected) {
    console.error("The output is not up-to-date");
    process.exit(1);
  }
  console.log("The output is up-to-date");
} else {
  await fs.writeFile(outputPath, mainFile.code);
  console.log("Build completed");
}
