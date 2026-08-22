"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    router.push("/loading");
  }

  return (
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
      className={`relative m-5 rounded-lg border border-dashed p-10 text-center transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-line hover:border-faint"
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
      <button
        onClick={() => dirInput.current?.click()}
        className="mt-5 accent-bg rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(239,80,51,0.7)] transition-transform hover:-translate-y-px active:translate-y-0"
      >
        Select folder
      </button>
      <button
        onClick={() => fileInput.current?.click()}
        className="block mx-auto mt-3 text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
      >
        or attach a .zip
      </button>

      <p className="mt-8 border-t border-line pt-4 text-xs text-faint font-mono">
        nothing leaves your browser until you choose a folder
      </p>
    </div>
  );
}
