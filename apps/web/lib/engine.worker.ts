/// <reference lib="webworker" />
import { collectEntries, clientExcluded, formatBytes } from "./files";
import type { Entry, Limits, Rule, ScanResponse } from "./types";

// Offline engine worker: runs repo2nb_core in Pyodide (WASM) so scan + generate
// happen entirely in the browser. If the engine can't initialize (old browser,
// runtime not cached yet), scan posts {kind:"engine_failed"} so the caller can
// fall back to the server worker; generate failures surface as {kind:"engine_error"}.

const PYODIDE_VERSION = "0.27.2";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type StartMsg = { kind: "start"; files: File[]; rules: Rule[]; limits: Limits };
type GenerateMsg = { kind: "generate"; entries: Entry[]; selection: string[]; target: string };
type InitMsg = { kind: "init" };

/** Minimal surface of the Pyodide API + our bridge module we actually touch. */
type WebApi = {
  scan_payload: (payload: string) => string;
  generate_payload: (payload: string) => string;
};
type Pyodide = {
  FS: { mkdir: (path: string) => void; writeFile: (path: string, data: string) => void };
  runPython: (code: string) => unknown;
};
type LoadPyodide = (opts: { indexURL: string }) => Promise<Pyodide>;

const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);
const scope = self as unknown as DedicatedWorkerGlobalScope & { loadPyodide: LoadPyodide };

let ready: Promise<WebApi> | null = null;

function initEngine(): Promise<WebApi> {
  if (!ready) {
    ready = (async () => {
      scope.importScripts(`${PYODIDE_BASE}pyodide.js`);
      const py = await scope.loadPyodide({ indexURL: PYODIDE_BASE });
      const res = await fetch("/engine.json");
      if (!res.ok) throw new Error("engine bundle missing");
      const { files } = (await res.json()) as { files: Record<string, string> };
      py.FS.mkdir("/engine");
      for (const [path, src] of Object.entries(files)) {
        const full = `/engine/${path}`;
        const parts = full.split("/").filter(Boolean);
        let cur = "";
        for (const part of parts.slice(0, -1)) {
          cur += `/${part}`;
          try {
            py.FS.mkdir(cur);
          } catch {
            // exists already
          }
        }
        py.FS.writeFile(full, src);
      }
      py.runPython("import sys; sys.path.insert(0, '/engine')");
      return py.runPython("from repo2nb_core import webapi; webapi") as WebApi;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function doScan(files: File[], rules: Rule[], limits: Limits) {
  const entries = await collectEntries(files);
  if (entries.length === 0) throw new Error("That folder is empty.");

  const candidates = entries.filter((en) => en.path === ".git/config" || !clientExcluded(en.path, rules));
  if (candidates.length === 0)
    throw new Error("Every file was filtered out by the default rules. Nothing to convert.");
  const bytes = candidates.reduce((s, en) => s + en.file.size, 0);
  if (bytes > limits.max_total_bytes)
    throw new Error(
      `Filtered project is ${formatBytes(bytes)}: over the ${formatBytes(limits.max_total_bytes)} direct-upload limit. Exclude large files or datasets and try again.`,
    );
  if (candidates.length > limits.max_files)
    throw new Error(`${candidates.length} files exceeds the ${limits.max_files}-file limit.`);

  post({ kind: "progress", frac: 0.35 });
  let webapi: WebApi;
  try {
    webapi = await initEngine();
  } catch (err) {
    post({ kind: "engine_failed", message: String(err) });
    return;
  }
  post({ kind: "progress", frac: 0.75 });

  const readText = async (path: string) =>
    candidates.find((c) => c.path === path ? true : false)
      ? await candidates.find((c) => c.path === path)!.file.text()
      : null;

  const payload = JSON.stringify({
    files: candidates.map((c) => ({ path: c.path, size: c.file.size })),
    gitignore: await readText(".gitignore"),
    repo2nbignore: await readText(".repo2nbignore"),
  });
  const result: ScanResponse = JSON.parse(webapi.scan_payload(payload));
  if (result.files.length === 0)
    throw new Error("Nothing survived the filters: the folder looks empty to repo2nb.");
  post({ kind: "progress", frac: 1 });
  post({ kind: "done", result, entries: candidates });
}

async function doGenerate(entries: Entry[], selection: string[], target: string) {
  const webapi = await initEngine();
  const files: Record<string, string> = {};
  for (const e of entries) files[e.path] = toB64(await e.file.arrayBuffer());
  const out = webapi.generate_payload(JSON.stringify({ files, selection, target }));
  post({ kind: "notebook", notebook: JSON.parse(out).notebook });
}

scope.onmessage = async (e: MessageEvent<StartMsg | GenerateMsg | InitMsg>) => {
  const m = e.data;
  try {
    if (m.kind === "start") await doScan(m.files, m.rules, m.limits);
    else if (m.kind === "generate") await doGenerate(m.entries, m.selection, m.target);
    else if (m.kind === "init") {
      await initEngine();
      post({ kind: "engine_ready" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ kind: m.kind === "generate" ? "engine_error" : "error", message });
  }
};
