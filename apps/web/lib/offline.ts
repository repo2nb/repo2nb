"use client";

import { generate as generateOnServer } from "./api";
import type { Entry, Target } from "./types";

/** Register the service worker that makes the app + Pyodide runtime work offline.
 * Dev is excluded on purpose: caching dev chunks breaks HMR. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[repo2nb] SW registration failed", err));
}

const ENGINE_FLAG = "repo2nb-engine-installed";

// keep in sync with CACHE in public/sw.js
export const SW_CACHE = "repo2nb-v6";
const PYODIDE_WASM = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.asm.wasm";

/** True when the current SW cache really holds the offline engine. The
 * localStorage flag alone can go stale across cache-version bumps. */
export async function cacheReady(): Promise<boolean> {
  try {
    const c = await caches.open(SW_CACHE);
    return !!(await c.match(PYODIDE_WASM)) && !!(await c.match("/engine.json"));
  } catch {
    return false;
  }
}

export function engineInstalled(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(ENGINE_FLAG) === "1";
}

export function markEngineInstalled() {
  try {
    localStorage.setItem(ENGINE_FLAG, "1");
  } catch {}
}

/** Downloads and initializes the Pyodide runtime + engine (~6 MB, one time) so the
 * tool works offline afterwards. Resolves once the engine runs in this browser. */
export function installEngine(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./engine.worker.ts", import.meta.url));
    const timer = setTimeout(() => {
      w.terminate();
      reject(new Error("engine install timed out"));
    }, 180_000);
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.kind === "engine_ready") {
        clearTimeout(timer);
        w.terminate();
        localStorage.setItem(ENGINE_FLAG, "1");
        resolve();      } else if (m.kind === "error" || m.kind === "engine_error" || m.kind === "engine_failed") {
        clearTimeout(timer);
        w.terminate();
        reject(new Error(m.message ?? "engine install failed"));
      }
    };
    w.onerror = () => {
      clearTimeout(timer);
      w.terminate();
      reject(new Error("engine worker failed to load"));
    };
    w.postMessage({ kind: "init" });
  });
}

/** Try the in-browser engine first; fall back to the server API. */
export async function generateWithFallback(entries: Entry[], selection: string[], target: Target): Promise<Blob> {
  try {
    const notebook = await generateViaEngine(entries, selection, target);
    return new Blob([JSON.stringify(notebook, null, 1)], { type: "application/x-ipynb+json" });
  } catch (err) {
    console.warn("[repo2nb] offline engine unavailable, falling back to server:", err);
    return generateOnServer(entries, selection, target);
  }
}

/** Shape of the successful generate message from the engine worker. */
type Notebook = Record<string, unknown>;

function generateViaEngine(entries: Entry[], selection: string[], target: Target): Promise<Notebook> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./engine.worker.ts", import.meta.url));
    const timer = setTimeout(() => {
      w.terminate();
      reject(new Error("offline engine timed out"));
    }, 120_000);
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.kind === "notebook") {
        clearTimeout(timer);
        w.terminate();
        resolve(m.notebook);
      } else if (m.kind === "engine_error") {
        clearTimeout(timer);
        w.terminate();
        reject(new Error(m.message));
      }
    };
    w.onerror = () => {
      clearTimeout(timer);
      w.terminate();
      reject(new Error("offline engine worker failed to load"));
    };
    w.postMessage({ kind: "generate", entries, selection, target });
  });
}
