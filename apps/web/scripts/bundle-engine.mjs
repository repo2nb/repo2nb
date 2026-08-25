// Bundles the pure-Python engine (+ vendored pathspec) into public/engine.json for
// the Pyodide offline worker. Runs via predev/prebuild hooks — no Python required.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const coreRoot = resolve(here, "../../../packages/repo2nb_core");

const roots = [
  { dir: join(coreRoot, "repo2nb_core"), prefix: "repo2nb_core" },
  { dir: join(coreRoot, "_vendor/pathspec"), prefix: "pathspec" },
];

const files = {};
for (const { dir, prefix } of roots) {
  walk(dir, prefix, dir);
}

// root stays fixed across recursion — computing relative() against the current
// subdir would flatten nested packages (targets/x.py -> x.py) and clobber keys
function walk(root, prefix, dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "__pycache__") walk(root, prefix, full);
      continue;
    }
    if (!name.endsWith(".py") && name !== "py.typed") continue;
    const rel = `${prefix}/${relative(root, full).split(sep).join("/")}`;
    files[rel] = readFileSync(full, "utf8");
  }
}

writeFileSync(join(here, "../public/engine.json"), JSON.stringify({ files }));
console.log(`[engine] bundled ${Object.keys(files).length} files -> public/engine.json`);
