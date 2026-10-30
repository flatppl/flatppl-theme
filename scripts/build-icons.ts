import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const assets = join(root, "assets");
const master = await readFile(join(assets, "logo-master.svg"), "utf8");
// Header artwork keeps every shape but omits the chalk and board effects.
await writeFile(join(assets, "logo.svg"), master
  .replace('data-chalk="on"', 'data-chalk="off"')
  .replace('data-edges="on"', 'data-edges="off"')
  .replace('data-board="on"', 'data-board="off"'));

function group(id: string): string {
  const opening = new RegExp(`<g id="${id}"[^>]*>`).exec(master);
  if (!opening) throw new Error(`missing logo group: ${id}`);
  const content = opening.index + opening[0].length;
  const tags = /<g\b[^>]*>|<\/g>/g;
  tags.lastIndex = content;
  let depth = 1;
  for (let tag = tags.exec(master); tag; tag = tags.exec(master)) {
    depth += tag[0] === "</g>" ? -1 : 1;
    if (depth === 0) return master.slice(content, tag.index);
  }
  throw new Error(`unclosed logo group: ${id}`);
}

const envelope = master.match(/<mask id="histogram-envelope"[\s\S]*?<\/mask>/)?.[0];
if (!envelope) throw new Error("missing histogram envelope");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <title>FlatPPL</title>
  <defs>${envelope}</defs>
  <rect width="256" height="256" rx="32" fill="#224535"/>
  <g fill="#ffffff" transform="translate(-5.64 .392) scale(1.04)">${group("plot-layer")}</g>
</svg>
`;
await writeFile(join(assets, "favicon.svg"), svg);

const temporary = await mkdtemp(join(tmpdir(), "flatppl-icons-"));
try {
  const icons = new Map<number, Buffer>();
  const sizes = [
    [16, "favicon-16x16.png"],
    [32, "favicon-32x32.png"],
    [48, null],
    [180, "apple-touch-icon.png"],
    [192, "android-chrome-192x192.png"],
    [512, "android-chrome-512x512.png"],
  ] as const;
  for (const [size, name] of sizes) {
    const output = name ? join(assets, name) : join(temporary, "48.png");
    const process = Bun.spawn([
      "rsvg-convert", "--width", String(size), "--height", String(size),
      join(assets, "favicon.svg"), "--output", output,
    ], { stdout: "pipe", stderr: "pipe" });
    const [code, error] = await Promise.all([process.exited, new Response(process.stderr).text()]);
    if (code !== 0) throw new Error(`rendering ${size}px icon failed: ${error}`);
    if (size <= 48) icons.set(size, await readFile(output));
  }

  const header = Buffer.alloc(6 + icons.size * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icons.size, 4);
  let entry = 6;
  let offset = header.length;
  for (const [size, png] of icons) {
    header[entry] = size;
    header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
    entry += 16;
  }
  await writeFile(join(assets, "favicon.ico"), Buffer.concat([header, ...icons.values()]));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
