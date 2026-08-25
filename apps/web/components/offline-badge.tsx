"use client";

import { useEffect, useState } from "react";
import { engineInstalled, installEngine } from "@/lib/offline";

type State = "hidden" | "caching" | "ready" | "offline";

/** Nav badge tracking offline readiness. After the service worker activates the
 * engine installs itself in the background (~6 MB, once; skipped on metered
 * connections): "caching…" → "offline ready" (green), turning orange-gradient
 * while fully offline. */
export function OfflineBadge() {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    const sync = () => {
      if (!navigator.onLine) return setState("offline");
      setState(engineInstalled() ? "ready" : "caching");
    };
    navigator.serviceWorker.ready.then(() => {
      if (cancelled) return;
      sync();
      const conn = navigator as Navigator & { connection?: { saveData?: boolean } };
      if (!engineInstalled() && !conn.connection?.saveData) {
        installEngine()
          .then(() => !cancelled && sync())
          .catch(() => {
            // engine couldn't install (old browser etc): stay quiet
            if (!cancelled && navigator.onLine && !engineInstalled()) setState("hidden");
          });
      }
    });
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (state === "hidden") return null;

  const content: Record<Exclude<State, "hidden">, { text: string; title: string; cls: string }> = {
    caching: {
      text: "○ caching…",
      title: "Downloading the offline conversion engine (~6 MB, one time). You can keep using the site.",
      cls: "border-line text-faint",
    },
    ready: {
      text: "● offline ready",
      title: "The conversion engine is installed in your browser. You can go offline anytime.",
      cls: "border-ok/40 text-ok",
    },
    offline: {
      text: "offline: fully functional",
      title: "You are offline. Everything runs locally in your browser.",
      cls: "border-accent/40 accent-text font-medium",
    },
  } as const;

  const c = content[state];
  return (
    <span
      title={c.title}
      className={`hidden md:inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] ${c.cls}`}
    >
      {c.text}
    </span>
  );
}
