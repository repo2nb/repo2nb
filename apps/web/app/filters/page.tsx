"use client";

import { useEffect, useState } from "react";
import { Faq, Footer, Nav } from "@/components/chrome";
import { getRules } from "@/lib/api";
import type { Rule } from "@/lib/types";

/** Defaults-transparency page: generated from the same DEFAULT_RULES the scanner uses (PRD §10.2). */
export default function FiltersPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRules().then((r) => setRules(r.rules)).catch((e) => setError(String(e)));
  }, []);

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
          <code className="font-mono text-fg bg-hover px-1 rounded">.repo2nbignore</code> can override any of it 
          use <code className="font-mono text-fg bg-hover px-1 rounded">!pattern</code> to force-include something
          listed here. Every rule below comes from the same source of truth the tool itself uses.
        </p>

        {error && <p className="mt-8 font-mono text-sm text-warn">{error}: is the API running?</p>}

        {!error && rules.length === 0 && <p className="mt-8 font-mono text-sm text-muted">loading…</p>}

        {[...groups.entries()].map(([group, rs]) => (
          <section key={group} className="mt-10">
            <h2 className="font-display text-xl tracking-tight">{group}</h2>
            <ul className="mt-3 grid sm:grid-cols-2 gap-x-8">
              {rs.map((r) => (
                <li key={r.pattern} className="flex justify-between gap-4 border-b border-line py-2 font-mono text-[13px]">
                  <span>{r.pattern}</span>
                  <span className="text-faint">{r.reason.split("").pop()?.trim()}</span>
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
  if (reason.includes("checkpoint") || reason.includes("weights")) return "Model checkpoints and weights";
  if (reason.includes("dataset")) return "Datasets";
  if (reason.includes("binary") || reason.includes("asset") || reason.includes("archive") || reason.includes("wheel"))
    return "Binaries and archives";
  if (reason.includes("environment") || reason.includes("key material")) return "Environment and secrets";
  if (reason.includes("version control") || reason.includes("editor") || reason.includes("CI config"))
    return "Tooling internals";
  if (reason.includes("database")) return "Databases";
  if (reason.includes("metadata")) return "Package metadata";
  return "Other";
}
