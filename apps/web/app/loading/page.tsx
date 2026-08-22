"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { getRules } from "@/lib/api";
import { session } from "@/lib/session";
import { Logo } from "@/components/chrome";
import type { ScanResponse } from "@/lib/types";

const VERBS = [
  "scanning the tree",
  "weighing files",
  "pruning the noise",
  "reading sources",
  "parsing imports",
  "tracing dependencies",
  "distilling code",
  "aligning tensors",
  "warming up the GPU",
  "shuffling batches",
  "averaging gradients",
  "compiling cells",
];

export default function LoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [verb, setVerb] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.files.length === 0) {
      router.replace("/");
      return;
    }

    const verbTimer = setInterval(() => setVerb((v) => (v + 1) % VERBS.length), 1600);
    let cancelled = false;

    (async () => {
      try {
        const { rules, limits } = await getRules();
        if (cancelled) return;
        const w = new Worker(new URL("../../lib/scan.worker.ts", import.meta.url));

        w.onmessage = (ev: MessageEvent) => {
          const m = ev.data;
          if (m.kind === "progress") return setProgress(m.frac);
          w.terminate();
          clearInterval(verbTimer);
          if (cancelled) return;
          if (m.kind === "error") {
            setError(m.message);
            return;
          }
          if (!m.result?.files) {
            setError("something went wrong while reading that folder.");
            return;
          }
          session.entries = m.entries;
          session.scan = m.result as ScanResponse;
          track("tree_previewed", { file_count: m.result.files.length, target: session.target });
          setTimeout(() => !cancelled && router.push("/convert"), 400);
        };
        w.onerror = () => {
          clearInterval(verbTimer);
          if (!cancelled) setError("something went wrong while reading that folder.");
        };

        w.postMessage({ kind: "start", files: [...session.files], rules, limits });
      } catch {
        clearInterval(verbTimer);
        setError("Can't reach the conversion API. Is it running on port 8000?");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(verbTimer);
    };
  }, [router]);

  const pct = Math.round(progress * 100);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <Logo />
      {error ? (
        <>
          <p role="alert" className="mt-8 max-w-md rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-center text-sm text-warn font-mono">
            {error}
          </p>
          <button onClick={() => router.push("/")} className="mt-6 text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
            pick a different folder
          </button>
        </>
      ) : (
        <>
          <p className="mt-10 font-display text-2xl tracking-tight h-8" aria-live="polite">
            <span key={verb} className="inline-block animate-[fadein_0.4s_ease]">
              {VERBS[verb]}
              <span className="animate-pulse">…</span>
            </span>
          </p>
          <p className="mt-2 font-mono text-xs text-faint">{pct}%</p>
          <div className="mt-4 h-1.5 rounded-full bg-hover overflow-hidden w-full max-w-md">
            <div className="accent-bg h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-8 text-xs text-faint">
            large folders take a moment; processing happens in the background
          </p>
        </>
      )}
    </main>
  );
}
