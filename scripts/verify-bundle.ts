import { verifyBundle } from "./bundle.ts";

const bundle = Bun.argv[2];
if (!bundle) throw new Error("usage: bun run scripts/verify-bundle.ts <bundle>");

const errors = await verifyBundle(bundle);
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
