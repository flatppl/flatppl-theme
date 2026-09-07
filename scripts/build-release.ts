import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildRelease } from "./bundle.ts";

function argumentsByName(args: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined) throw new Error(`invalid argument: ${name ?? ""}`);
    values.set(name.slice(2), value);
  }
  return values;
}

async function gitCommit(): Promise<string> {
  const process = Bun.spawn(["git", "rev-parse", "HEAD"], { stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout] = await Promise.all([process.exited, new Response(process.stdout).text()]);
  if (exitCode !== 0) throw new Error("cannot resolve the source commit");
  return stdout.trim();
}

const args = argumentsByName(Bun.argv.slice(2));
const root = resolve(import.meta.dir, "..");
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
await buildRelease({
  source: args.get("source") ?? root,
  output: args.get("output") ?? resolve(root, "dist"),
  version: args.get("version") ?? packageData.version,
  sourceCommit: args.get("source-commit") ?? process.env.GITHUB_SHA ?? await gitCommit(),
  sourceRelease: args.get("source-release") ?? process.env.FLATPPL_THEME_RELEASE,
});
