import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, parse, relative, resolve, sep } from "node:path";

const REPOSITORY = "https://github.com/flatppl/flatppl-theme";
const REQUIRED_FILES = [
  "assets/android-chrome-192x192.png",
  "assets/android-chrome-512x512.png",
  "assets/apple-touch-icon.png",
  "assets/favicon-16x16.png",
  "assets/favicon-32x32.png",
  "assets/favicon.ico",
  "assets/logo-original.png",
  "assets/logo.svg",
  "assets/site.webmanifest",
  "assets/wordmark.svg",
  "components.css",
  "footer.html",
  "header.html",
  "LICENSE.md",
  "LICENSES/CC-BY-4.0.txt",
  "LICENSES/MIT.txt",
  "shell.css",
  "shell.js",
  "syntax-map.json",
  "tokens.css",
] as const;

type ManifestFile = {
  path: string;
  sha256: string;
  size: number;
};

type Manifest = {
  schema: 1;
  name: "flatppl-theme";
  version: string;
  source: {
    repository: typeof REPOSITORY;
    commit: string;
    release?: string;
  };
  files: ManifestFile[];
};

export type BuildOptions = {
  source: string;
  output: string;
  version: string;
  sourceCommit: string;
  sourceRelease?: string;
};

function portable(path: string): string {
  return path.split(sep).join("/");
}

async function filesUnder(root: string): Promise<string[]> {
  const paths: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) paths.push(portable(relative(root, path)));
    }
  }
  await visit(root);
  return paths.sort();
}

async function digest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function validateBuildPaths(source: string, output: string): void {
  const sourcePath = resolve(source);
  const outputPath = resolve(output);
  if (outputPath === parse(outputPath).root) throw new Error("refusing to use a filesystem root as output");
  if (sourcePath === outputPath) throw new Error("source and output must differ");
  if (sourcePath.startsWith(outputPath + sep)) throw new Error("source must not be inside output");
}

export async function buildRelease(options: BuildOptions): Promise<Manifest> {
  validateBuildPaths(options.source, options.output);
  const source = resolve(options.source);
  const output = resolve(options.output);
  const temporary = join(dirname(output), `.${basename(output)}.tmp`);

  for (const path of REQUIRED_FILES) {
    if (!(await stat(join(source, path))).isFile()) throw new Error(`required theme file is not a file: ${path}`);
  }

  await rm(temporary, { recursive: true, force: true });
  await mkdir(temporary, { recursive: true });
  for (const path of REQUIRED_FILES.filter((path) => !path.startsWith("assets/"))) {
    await mkdir(dirname(join(temporary, path)), { recursive: true });
    await cp(join(source, path), join(temporary, path));
  }
  await cp(join(source, "assets"), join(temporary, "assets"), { recursive: true });

  const files = await filesUnder(temporary);
  const manifestFiles = await Promise.all(files.map(async (path): Promise<ManifestFile> => {
    const file = join(temporary, path);
    return { path, sha256: await digest(file), size: (await stat(file)).size };
  }));
  const manifest: Manifest = {
    schema: 1,
    name: "flatppl-theme",
    version: options.version,
    source: {
      repository: REPOSITORY,
      commit: options.sourceCommit,
      ...(options.sourceRelease ? { release: options.sourceRelease } : {}),
    },
    files: manifestFiles,
  };
  await writeFile(join(temporary, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  await rm(output, { recursive: true, force: true });
  await rename(temporary, output);
  return manifest;
}

export async function verifyBundle(bundle: string): Promise<string[]> {
  const root = resolve(bundle);
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as Manifest;
  const errors: string[] = [];
  const declared = new Map(manifest.files.map((file) => [file.path, file]));
  const actual = (await filesUnder(root)).filter((path) => path !== "manifest.json");

  for (const path of actual) {
    if (!declared.has(path)) errors.push(`${path}: not declared in manifest`);
  }
  for (const [path, expected] of declared) {
    if (!actual.includes(path)) {
      errors.push(`${path}: missing`);
      continue;
    }
    const file = join(root, path);
    const size = (await stat(file)).size;
    if (size !== expected.size) errors.push(`${path}: size mismatch`);
    if (await digest(file) !== expected.sha256) errors.push(`${path}: SHA-256 mismatch`);
  }
  return errors;
}
