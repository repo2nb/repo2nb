/// <reference lib="webworker" />
import { collectEntries, clientExcluded, formatBytes } from "./files";
import type { Entry, Limits, Rule, ScanResponse } from "./types";

// Runs the entire ingest pipeline off the main thread so the UI never freezes:
// collect entries -> client pre-filter -> validate caps -> multipart upload with progress.

type StartMsg = { kind: "start"; files: File[]; rules: Rule[]; limits: Limits };

const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

function upload(entries: Entry[], onProgress: (frac: number) => void): Promise<ScanResponse> {
  const form = new FormData();
  for (const e of entries) form.append("files", e.file, e.path);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/scan");
    let last = 0;
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const frac = e.loaded / e.total;
      // throttle: only report meaningful steps so we don't flood the UI thread
      if (frac - last >= 0.03 || frac === 1) {
        last = frac;
        onProgress(frac);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else {
        let detail = `scan failed (${xhr.status})`;
        try {
          detail = JSON.parse(xhr.responseText)?.detail ?? detail;
        } catch {}
        reject(new Error(detail));
      }
    };
    xhr.onerror = () => reject(new Error("network error: is the API server running?"));
    xhr.send(form);
  });
}

self.onmessage = async (e: MessageEvent<StartMsg>) => {
  const { files, rules, limits } = e.data;
  const t0 = Date.now();
  console.info(`[repo2nb worker] ingest started: ${files.length} items`);
  try {
    const entries = await collectEntries(files);
    if (entries.length === 0) throw new Error("That folder is empty.");

    // .git/config must survive pre-filtering: the generator reads the origin URL from it
    const candidates = entries.filter(
      (en) => en.path === ".git/config" || !clientExcluded(en.path, rules),
    );
    if (candidates.length === 0)
      throw new Error("Every file was filtered out by the default rules. Nothing to convert.");
    const bytes = candidates.reduce((s, en) => s + en.file.size, 0);
    console.info(
      `[repo2nb worker] ${entries.length} entries -> ${candidates.length} candidates (${formatBytes(bytes)}); prefilter took ${Date.now() - t0} ms`,
    );
    if (bytes > limits.max_total_bytes)
      throw new Error(
        `Filtered project is ${formatBytes(bytes)}: over the ${formatBytes(limits.max_total_bytes)} direct-upload limit. Exclude large files or datasets and try again.`,
      );
    if (candidates.length > limits.max_files)
      throw new Error(`${candidates.length} files exceeds the ${limits.max_files}-file limit.`);

    const result = await upload(candidates, (frac) => post({ kind: "progress", frac }));
    console.info(`[repo2nb worker] scan done in ${Date.now() - t0} ms: ${result.files.length} nodes`);
    if (result.files.length === 0)
      throw new Error("Nothing survived the filters: the folder looks empty to repo2nb.");
    post({ kind: "done", result, entries: candidates });
  } catch (err) {
    post({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
