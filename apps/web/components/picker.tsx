"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { session } from "@/lib/session";
import { IconFolder } from "./icons";

export function Picker() {
  const router = useRouter();
  const dirInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onSelect(list: FileList | File[]) {
    session.files = Array.from(list);
    // navigate immediately; the /loading page owns the background pipeline
    track("folder_selected");
    router.push("/loading");
  }

  return (
    <div className="mx-auto max-w-xl rounded-[1.75rem] bg-hover/60 p-1.5 ring-1 ring-line">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onSelect(e.dataTransfer.files);
        }}
        className={`rounded-[calc(1.75rem-0.375rem)] border border-dashed p-10 text-center transition-all duration-300 ${
          dragging
            ? "scale-[0.99] border-accent bg-accent/5 shadow-[0_0_0_4px_rgba(239,80,51,0.12)]"
            : "border-line bg-panel hover:border-faint"
        }`}
      >
        <input
          ref={dirInput}
          type="file"
          // @ts-expect-error non-standard but supported in Chrome/Edge/Safari
          webkitdirectory=""
          multiple
          hidden
          onChange={(e) => e.target.files && onSelect(e.target.files)}
        />
        <input ref={fileInput} type="file" accept=".zip" hidden onChange={(e) => e.target.files && onSelect(e.target.files)} />

        <IconFolder className="mx-auto mb-3 text-muted" width={28} height={28} />
        <h2 className="font-display text-xl tracking-tight">Choose a folder</h2>
        <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto">
          Pick a project folder, or drop it here. A <span className="font-mono">.zip</span> works too.
        </p>

        {/* pill CTA with nested trailing arrow */}
        <button
          onClick={() => dirInput.current?.click()}
          className="accent-bg group mt-6 inline-flex items-center gap-2 rounded-full py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_12px_28px_-10px_rgba(239,80,51,0.65)] transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
        >
          Select folder
          <span className="flex size-7 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="block mx-auto mt-3 text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          or attach a .zip
        </button>

        <p className="mt-8 border-t border-line pt-4 text-xs text-faint font-mono">
          works fully offline... your code never has to leave this tab
        </p>
      </div>
    </div>
  );
}
