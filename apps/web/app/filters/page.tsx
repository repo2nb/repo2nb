"use client";

import { Faq, Footer, Nav } from "@/components/chrome";
import snapshot from "@/lib/default-rules.json";
import type { Rule } from "@/lib/types";

/** Defaults-transparency page. Renders from the committed JSON snapshot of
 * DEFAULT_RULES (kept in sync by tests/test_core.py in repo2nb_core) — no API call,
 * so it works even when the conversion backend is cold or down. */
export default function FiltersPage() {
  const rules = snapshot.rules as Rule[];

  const groups = new Map<string, Rule[]>();
  for (const r of rules) {
    const groupKey = classify(r.reason);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(r);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-3xl tracking-tight">Default filters</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          These rules run before anything else, on every conversion. Your project&apos;s{" "}
          <code className="font-mono text-fg bg-hover px-1 rounded">.gitignore</code> is applied next, and a{" "}
          <code className="font-mono text-fg bg-hover px-1 rounded">.repo2nbignore</code> can override any of it —
          use <code className="font-mono text-fg bg-hover px-1 rounded">!pattern</code> to force-include something
          listed here. Every rule below comes from the same source of truth the tool itself uses.
        </p>

        {[...groups.entries()].map(([group, rs]) => (
          <section key={group} className="mt-10">
            <h2 className="font-display text-xl tracking-tight">{group}</h2>
            <ul className="mt-3 grid sm:grid-cols-2 gap-x-8">
              {rs.map((r) => (
                <li key={r.pattern} className="flex justify-between gap-4 border-b border-line py-2 font-mono text-[13px]">
                  <span>{r.pattern}</span>
                  <span className="text-faint">{r.reason.split(":").pop()?.trim()}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-12 rounded-lg border border-line bg-panel p-5">
          <h2 className="font-display text-lg tracking-tight">Precedence</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-muted list-decimal list-inside font-mono">
            <li>repo2nb defaults (this page)</li>
            <li>your project&apos;s .gitignore</li>
            <li>your project&apos;s .repo2nbignore</li>
            <li>checkbox toggles in the tree preview</li>
          </ol>
          <p className="mt-3 text-xs text-faint">each layer overrides the one above it</p>
        </section>
      </main>
      <Faq />
      <Footer />
    </>
  );
}

function classify(reason: string): string {
  if (reason.includes("dependency")) return "Dependency folders";
  if (reason.includes("cache") || reason.includes("build")) return "Caches and build artifacts";
  if (reason.includes("checkpoint")) return "Model checkpoints";
  if (reason.includes("dataset")) return "Datasets";
  if (reason.includes("version control") || reason.includes("editor") || reason.includes("CI config"))
    return "Tooling internals";
  if (reason.includes("environment") || reason.includes("secrets")) return "Environment and secrets";
  return "Other";
}
