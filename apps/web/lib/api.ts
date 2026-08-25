import snapshot from "./default-rules.json";
import type { Limits, Rule, Target } from "./types";

/** Rules/limits come from the committed snapshot of the Python core (sync-guarded by
 * a core test), so nothing in the UI depends on a network call before conversion. */
export async function getRules(): Promise<{ rules: Rule[]; limits: Limits }> {
  return snapshot;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function detail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function generate(
  entries: { path: string; file: File }[],
  selection: string[],
  target: Target,
): Promise<Blob> {
  const form = new FormData();
  for (const e of entries) form.append("files", e.file, e.path);
  form.append("selection", JSON.stringify(selection));
  form.append("target", target);
  const res = await fetch("/api/generate", { method: "POST", body: form });
  if (!res.ok) throw new ApiError(res.status, await detail(res));
  const nb = (await res.json()).notebook;
  return new Blob([JSON.stringify(nb, null, 1)], { type: "application/x-ipynb+json" });
}
