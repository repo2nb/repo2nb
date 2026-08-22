import type { Limits, Rule, Target } from "./types";

let cachedRules: { rules: Rule[]; limits: Limits } | null = null;

export async function getRules(): Promise<{ rules: Rule[]; limits: Limits }> {
  if (!cachedRules) {
    const res = await fetch("/api/rules");
    if (!res.ok) throw new Error("couldn't load filter rules");
    cachedRules = await res.json();
  }
  return cachedRules!;
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
