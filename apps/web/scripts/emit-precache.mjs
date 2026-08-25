// postbuild: emit the list of built static assets so sw.js can precache them.
// Route chunks are dynamic imports — without this list they're only cached when
// the user happens to visit each route online, which breaks offline navigation.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".next", "static");
const out = [];

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else {
      const rel = "/_next/static/" + p.slice(root.length + 1).split("\\").join("/");
      if (rel) out.push(rel); // never emit empty entries
    }
  }
})(root);

writeFileSync(join(process.cwd(), "public", "sw-precache.json"), JSON.stringify(out));
console.log(`[repo2nb] sw-precache: ${out.length} static assets listed`);
