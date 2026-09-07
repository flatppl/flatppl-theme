import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const workdirs: string[] = [];

afterEach(async () => {
  await Promise.all(workdirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(): Promise<{ root: string; source: string; output: string }> {
  const root = join(tmpdir(), `flatppl-theme-${crypto.randomUUID()}`);
  const source = join(root, "source");
  const output = join(root, "dist");
  workdirs.push(root);
  await mkdir(join(source, "assets"), { recursive: true });
  await mkdir(join(source, "LICENSES"), { recursive: true });
  await Promise.all([
    writeFile(join(source, "LICENSE.md"), "Code: MIT. Assets: CC BY 4.0.\n"),
    writeFile(join(source, "LICENSES", "CC-BY-4.0.txt"), "CC BY 4.0\n"),
    writeFile(join(source, "LICENSES", "MIT.txt"), "MIT\n"),
    writeFile(join(source, "tokens.css"), ":root { --fp-bg: #fafaf8; }\n"),
    writeFile(join(source, "components.css"), ".fp-btn { color: inherit; }\n"),
    writeFile(join(source, "header.html"), "<header>FlatPPL</header>\n"),
    writeFile(join(source, "footer.html"), "<footer>GitHub</footer>\n"),
    writeFile(join(source, "shell.css"), ".fp-shell { display: grid; }\n"),
    writeFile(join(source, "shell.js"), "export {};\n"),
    writeFile(join(source, "syntax-map.json"), "{}\n"),
    writeFile(join(source, "assets", "android-chrome-192x192.png"), "192\n"),
    writeFile(join(source, "assets", "android-chrome-512x512.png"), "512\n"),
    writeFile(join(source, "assets", "apple-touch-icon.png"), "180\n"),
    writeFile(join(source, "assets", "favicon-16x16.png"), "16\n"),
    writeFile(join(source, "assets", "favicon-32x32.png"), "32\n"),
    writeFile(join(source, "assets", "favicon.ico"), "ico\n"),
    writeFile(join(source, "assets", "logo-original.png"), "original\n"),
    writeFile(join(source, "assets", "logo.svg"), "<svg/>\n"),
    writeFile(join(source, "assets", "site.webmanifest"), "{}\n"),
    writeFile(join(source, "assets", "wordmark.svg"), "<svg/>\n"),
  ]);
  return { root, source, output };
}

async function run(script: string, args: string[]): Promise<{ exitCode: number; stderr: string }> {
  const process = Bun.spawn(["bun", "run", script, ...args], {
    cwd: import.meta.dir + "/..",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
  ]);
  return { exitCode, stderr };
}

describe("release bundle", () => {
  test("builds the public files with pinned source metadata and valid hashes", async () => {
    const { source, output } = await fixture();

    const result = await run("scripts/build-release.ts", [
      "--source", source,
      "--output", output,
      "--version", "0.1.0",
      "--source-commit", "0123456789abcdef0123456789abcdef01234567",
      "--source-release", "v0.1.0",
    ]);

    expect(result.exitCode, result.stderr).toBe(0);
    const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
    expect(manifest).toMatchObject({
      schema: 1,
      name: "flatppl-theme",
      version: "0.1.0",
      source: {
        repository: "https://github.com/flatppl/flatppl-theme",
        commit: "0123456789abcdef0123456789abcdef01234567",
        release: "v0.1.0",
      },
    });
    expect(manifest.files.map((file: { path: string }) => file.path)).toEqual([
      "LICENSE.md",
      "LICENSES/CC-BY-4.0.txt",
      "LICENSES/MIT.txt",
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
      "shell.css",
      "shell.js",
      "syntax-map.json",
      "tokens.css",
    ]);

    const verified = await run("scripts/verify-bundle.ts", [output]);
    expect(verified.exitCode, verified.stderr).toBe(0);
  });

  test("rejects a changed bundled file", async () => {
    const { source, output } = await fixture();
    const built = await run("scripts/build-release.ts", [
      "--source", source,
      "--output", output,
      "--version", "0.1.0",
      "--source-commit", "0123456789abcdef0123456789abcdef01234567",
    ]);
    expect(built.exitCode, built.stderr).toBe(0);
    await writeFile(join(output, "tokens.css"), ":root {}\n");

    const result = await run("scripts/verify-bundle.ts", [output]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("tokens.css: SHA-256 mismatch");
  });

});
