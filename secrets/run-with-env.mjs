import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

const separator = process.argv.indexOf("--");
if (separator < 3 || separator === process.argv.length - 1) {
  console.error(
    "Usage: node secrets/run-with-env.mjs <env-file...> -- <command> [args...]",
  );
  process.exit(2);
}

const files = process.argv.slice(2, separator);
const [command, ...args] = process.argv.slice(separator + 1);
const loaded = {};

for (const file of files) {
  Object.assign(loaded, parseEnv(readFileSync(file, "utf8")));
}

const result = spawnSync(command, args, {
  env: { ...loaded, ...process.env },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
