import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const syntaxTokens = ["red", "yellow", "green", "cyan", "blue", "purple", "comment"];

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function variables(block: string): Map<string, string> {
  return new Map([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]));
}

describe("syntax palette", () => {
  test("each syntax colour meets WCAG AA on the ground and raised surface", async () => {
    const css = await readFile(resolve(import.meta.dir, "..", "tokens.css"), "utf8");
    const light = variables(css.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? "");
    const dark = variables(css.match(/:root\[data-theme="dark"\]\s*{([\s\S]*?)\n}/)?.[1] ?? "");
    const failures: string[] = [];

    for (const [name, palette] of [["light", light], ["dark", dark]] as const) {
      for (const backgroundName of ["bg", "surface"]) {
        const background = palette.get(`--fp-${backgroundName}`);
        if (!background) {
          failures.push(`${name} ${backgroundName} is missing`);
          continue;
        }
        for (const token of syntaxTokens) {
          const colour = palette.get(`--fp-syn-${token}`);
          if (!colour) failures.push(`${name} ${token} is missing`);
          else if (contrast(colour, background) < 4.5) failures.push(`${name} ${token} on ${backgroundName}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
