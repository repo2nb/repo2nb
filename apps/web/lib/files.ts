import { unzipSync } from "fflate";
import type { Entry, Rule } from "./types";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * ponytail: gitignore-lite — only handles the pattern shapes our default rules use
 * (dir/, *.ext, exact-name, prefix*). The server re-decides with real pathspec anyway;
 * this exists purely for the pre-upload byte budget.
 */
export function matchesRule(path: string, pattern: string): boolean {
  const name = path.split("/").pop() ?? path;
  if (pattern.endsWith("/")) return path.split("/").slice(0, -1).includes(pattern.slice(0, -1));
  if (pattern.startsWith("*.")) return name.endsWith(pattern.slice(1));
  if (pattern.includes("*")) {
    const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return re.test(name);
  }
  return name === pattern || path === pattern;
}

export function clientExcluded(path: string, rules: Rule[]): string | null {
  for (const r of rules) if (matchesRule(path, r.pattern)) return r.reason;
  return null;
}

/** Strip a shared top-level segment ("myproj/src/x.py" -> "src/x.py") so paths are root-relative. */
function normalize(entries: Entry[]): Entry[] {
  if (entries.length < 2) return entries;
  const first = entries[0].path.split("/")[0];
  if (!first) return entries;
  if (entries.every((e) => e.path.startsWith(first + "/") && e.path !== first + "/"))
    return entries.map((e) => ({ ...e, path: e.path.slice(first.length + 1) }));
  return entries;
}

/** Folder picker, dropped files, or a single .zip into normalized entries. Runs inside the worker. */
/** .git internals are skipped, except config: the generator parses the origin URL from it. */
function isGitInternal(path: string): boolean {
  if (path === ".git/config") return false;
  return path === ".git" || path.startsWith(".git/");
}

export async function collectEntries(files: File[]): Promise<Entry[]> {
  if (files.length === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
    const unzipped = unzipSync(new Uint8Array(await files[0].arrayBuffer()));
    const out = Object.entries(unzipped)
      .filter(([p, d]) => !p.endsWith("/") && !isGitInternal(p) && d.length > 0)
      .map(([p, d]) => ({ path: p.replace(/\\/g, "/"), file: new File([d], p) }));
    return normalize(out);
  }
  const entries = files
    .map((f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      return { path: rel.replace(/\\/g, "/"), file: f };
    })
    .filter((e) => e.path && !e.path.endsWith("/") && !isGitInternal(e.path));
  return normalize(entries);
}
