// Bundles the pure-Python engine (+ vendored pathspec) into public/engine.json,
// and mirrors the Pyodide runtime into public/pyodide/ so the browser engine is
// fully same-origin (no CDN = nothing third-party + reliable SW caching).
// Runs via predev/prebuild hooks.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

// mirror the Pyodide runtime (skips files already present — bump PYODIDE_VERSION
// to refresh; delete public/pyodide to force a re-download)
const PYODIDE_VERSION = "0.27.2";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_FILES = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];
const outDir = join(here, "../public/pyodide");
mkdirSync(outDir, { recursive: true });
for (const f of PYODIDE_FILES) {
  const dest = join(outDir, f);
  if (existsSync(dest) && statSync(dest).size > 0) continue;
  const res = await fetch(PYODIDE_BASE + f);
  if (!res.ok) throw new Error(`pyodide download failed: ${f} (${res.status})`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`[engine] fetched ${f} (${(statSync(dest).size / 1e6).toFixed(1)} MB)`);
}
