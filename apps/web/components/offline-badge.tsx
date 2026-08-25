"use client";

import { useCallback, useEffect, useState } from "react";
import { engineInstalled, installEngine } from "@/lib/offline";

type State = "hidden" | "caching" | "idle" | "installing" | "ready" | "offline";

/** Nav badge making the offline guarantee visible: once the service worker is active
 * the user can install the conversion engine into their browser with one click. */
export function OfflineBadge() {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sync = () => {
      if (!navigator.onLine) return setState("offline");
      navigator.serviceWorker.ready.then(() => setState(engineInstalled() ? "ready" : "idle"));
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const install = useCallback(() => {
    setState("installing");
    installEngine()
      .then(() => setState("ready"))
      .catch(() => setState("idle"));
  }, []);

  if (state === "hidden") return null;

  const content: Record<Exclude<State, "hidden">, { text: string; title: string; cls: string; onClick?: () => void }> = {
    caching: { text: "caching…", title: "Preparing offline support", cls: "border-line text-faint" },
    idle: {
      text: "enable offline mode",
      title: "Download the conversion engine (~6 MB) into your browser so your code never has to leave your machine",
      cls: "border-line text-muted hover:text-fg hover:border-faint cursor-pointer",
      onClick: install,
    },
    installing: { text: "installing engine…", title: "Downloading the conversion runtime", cls: "border-line text-muted" },
    ready: { text: "● offline ready", title: "The conversion engine is installed in your browser. You can go offline now.", cls: "border-ok/40 text-ok" },
    offline: { text: "offline: fully functional", title: "You are offline. The conversion engine runs entirely in your browser.", cls: "border-ok/40 text-ok" },
  } as const;

  const c = content[state];
  const Tag = c.onClick ? "button" : "span";
  return (
    <Tag
      onClick={c.onClick}
      title={c.title}
      className={`hidden md:inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] ${c.cls}`}
    >
      {c.text}
    </Tag>
  );
}
