"use client";

import { useMemo, useState } from "react";
import { formatBytes } from "@/lib/files";
import { buildTree, sortedChildren, type TreeNode } from "@/lib/tree";
import type { ScanNode, ScanResponse, Target } from "@/lib/types";
import { IconChevron, IconDownload, IconFile, IconFolder } from "./icons";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_20px_60px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
      {children}
    </div>
  );
}

export function TreeScreen(props: {
  scan: ScanResponse;
  checked: Set<string>;
  setChecked: (s: Set<string>) => void;
  budget: number;
  maxBytes: number;
  target: Target;
  setTarget: (t: Target) => void;
  notebookName: string;
  setNotebookName: (name: string) => void;
  onGenerate: () => void;
  busy: boolean;
  onReset: () => void;
}) {
  const tree = useMemo(() => buildTree(props.scan.files), [props.scan]);
  const overBudget = props.budget > props.maxBytes;
  const pct = Math.min(100, (props.budget / props.maxBytes) * 100);
  const largest = [...props.checked]
    .map((p) => props.scan.files.find((f) => f.path === p))
    .filter((f): f is ScanNode => Boolean(f))
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);

  const toggleMany = (paths: string[], on: boolean) => {
    const next = new Set(props.checked);
    for (const p of paths) {
      if (on) next.add(p);
      else next.delete(p);
    }
    props.setChecked(next);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <button onClick={props.onReset} className="text-xs text-muted hover:text-fg font-mono">
          ← start over
        </button>
        <label className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-[11px] uppercase tracking-wide text-faint">name</span>
          <input
            value={props.notebookName}
            onChange={(e) => props.setNotebookName(e.target.value)}
            placeholder="my-project"
            spellCheck={false}
            className="w-36 rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-xs text-fg placeholder:text-faint focus:outline-none focus:border-accent"
          />
        </label>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-faint mr-1">target</span>
          {(["kaggle", "colab"] as Target[]).map((t) => (
            <button
              key={t}
              onClick={() => props.setTarget(t)}
              className={`rounded-md px-3 py-1.5 font-mono text-xs capitalize transition-colors ${
                props.target === t ? "accent-bg text-white" : "border border-line text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_240px]">
        <div className="max-h-[420px] overflow-auto px-2 py-2 font-mono text-[13px] select-none">
          <Row node={tree} depth={0} checked={props.checked} toggleMany={toggleMany} />
        </div>

        <aside className="border-t md:border-t-0 md:border-l border-line p-4 space-y-4">
          <div>
            <p className="font-mono text-xs text-muted">
              {formatBytes(props.budget)} / {formatBytes(props.maxBytes)}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-hover overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] ${overBudget ? "bg-accent" : "accent-bg"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {overBudget && <p className="mt-2 text-xs text-accent">over budget: deselect something first</p>}
          </div>
          {largest.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-faint mb-1.5">largest included</p>
              <ul className="space-y-1">
                {largest.map((f) => (
                  <li key={f.path} className="flex justify-between gap-2 text-[11px]">
                    <span className="truncate text-muted">{f.path}</span>
                    <span className="shrink-0 text-faint">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
        <p className="text-xs text-faint font-mono">
          {props.checked.size} files · setup cells included in notebook
        </p>
        <button
          onClick={props.onGenerate}
          disabled={props.busy || props.checked.size === 0 || overBudget}
          className="accent-bg rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_-8px_rgba(239,80,51,0.7)]"
        >
          {props.busy ? "generating…" : "Generate notebook"}
        </button>
      </div>
    </>
  );
}

function Row({
  node,
  depth,
  checked,
  toggleMany,
}: {
  node: TreeNode;
  depth: number;
  checked: Set<string>;
  toggleMany: (paths: string[], on: boolean) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const children = sortedChildren(node);
  const filePaths = useMemo(() => {
    const acc: string[] = [];
    const walk = (n: TreeNode) => {
      for (const c of n.children.values()) {
        if (c.children.size > 0) walk(c);
        else acc.push(c.path);
      }
    };
    walk(node);
    return acc;
  }, [node]);
  const selectedCount = filePaths.filter((p) => checked.has(p)).length;

  if (node.file) {
    const f = node.file as ScanNode;
    const on = checked.has(f.path);
    return (
      <label
        title={f.reason || undefined}
        className={`group flex items-center gap-2 rounded px-2 py-[3px] cursor-pointer ${
          f.included ? "" : "opacity-50"
        } ${on ? "bg-accent/[0.06]" : "hover:bg-hover"}`}
      >
        <input
          type="checkbox"
          checked={on}
          onChange={() => toggleMany([f.path], !on)}
          className="size-3.5 accent-[var(--accent)] shrink-0"
        />
        <IconFile className="shrink-0 text-faint" />
        <span className={`truncate ${on ? "text-fg" : "text-muted"}`}>{node.name}</span>
        {!f.included && f.reason && <span className="ml-auto shrink-0 text-[10px] text-faint hidden group-hover:inline">{f.reason}</span>}
        {f.included && <span className="ml-auto w-1.5 h-1.5 rounded-full accent-bg shrink-0" aria-label="included by default" />}
      </label>
    );
  }

  if (!node.name) {
    return (
      <div>
        {children.map((c) => (
          <Row key={c.path} node={c} depth={depth} checked={checked} toggleMany={toggleMany} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded px-2 py-[3px] w-full text-left hover:bg-hover"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <IconChevron className={`text-faint transition-transform ${open ? "rotate-90" : ""}`} />
        <input
          type="checkbox"
          checked={selectedCount === filePaths.length && filePaths.length > 0}
          ref={(el) => {
            if (el) el.indeterminate = selectedCount > 0 && selectedCount < filePaths.length;
          }}
          onClick={(e) => e.preventDefault()}
          onChange={() => toggleMany(filePaths, selectedCount < filePaths.length)}
          className="size-3.5 accent-[var(--accent)]"
        />
        <IconFolder className="text-faint" />
        <span className="text-muted">{node.name}</span>
      </button>
      {open && (
        <div>
          {children.map((c) => (
            <Row key={c.path} node={c} depth={depth + 1} checked={checked} toggleMany={toggleMany} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ResultScreen({
  url,
  filename,
  ignoreText,
  onReset,
}: {
  url: string | null;
  filename: string;
  ignoreText: string;
  onReset: () => void;
}) {
  function download(text: string, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="m-5 rounded-lg border border-ok/40 bg-ok/5 p-10 text-center">
      <h2 className="font-display text-xl tracking-tight">Notebook ready.</h2>
      <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto">
        Setup instructions are baked into the first markdown cells; they travel with the file.
      </p>
      {url ? (
        <a
          href={url}
          download={filename}
          className="accent-bg mt-5 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(239,80,51,0.7)]"
        >
          <IconDownload /> Download {filename}
        </a>
      ) : (
        <p className="mt-5 text-sm text-warn">download unavailable: regenerate the notebook</p>
      )}
      {ignoreText && (
        <button
          onClick={() => download(ignoreText, ".repo2nbignore")}
          className="block mx-auto mt-3 text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          also download your .repo2nbignore
        </button>
      )}
      <button onClick={onReset} className="block mx-auto mt-6 text-xs text-faint hover:text-fg">
        convert another project
      </button>
    </div>
  );
}
