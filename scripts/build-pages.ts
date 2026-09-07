import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const output = resolve(root, "_site");

await rm(output, { recursive: true, force: true });
await cp(resolve(root, "dist"), output, { recursive: true });

const preview = await readFile(resolve(root, "preview", "index.html"), "utf8");
await writeFile(resolve(output, "index.html"), preview.replaceAll("../", "./"));
await writeFile(resolve(output, ".nojekyll"), "");
