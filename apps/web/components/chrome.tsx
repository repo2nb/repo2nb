"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { OfflineBadge } from "./offline-badge";
import { IconGithub, IconLinkedin, IconMoon, IconReddit, IconSun } from "./icons";

export function Logo() {
  return (
    <Link href="/" className="accent-text font-display text-lg font-medium tracking-tight">
      repo2nb
    </Link>
  );
}

export function Nav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3.5">
        <Logo />
        <div className="hidden sm:flex items-center gap-5 text-sm text-muted ml-4">
          <Link href="/#tool" className="navlink hover:text-fg">Home</Link>
          <Link href="/#how" className="navlink hover:text-fg">How it works</Link>
          <Link href="/filters" className="navlink hover:text-fg">Filters</Link>
          <Link href="/privacy" className="navlink hover:text-fg">Privacy</Link>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <OfflineBadge />
          <a
            href="https://github.com/repo2nb/repo2nb"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md text-muted hover:text-fg hover:bg-hover"
            aria-label="GitHub"
          >
            <IconGithub />
          </a>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-muted hover:text-fg hover:bg-hover"
            aria-label="Toggle theme"
          >
            {mounted && resolvedTheme === "light" ? <IconMoon /> : <IconSun />}
          </button>
        </div>
      </nav>
    </header>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const qa = [
    [
      "Do you store my code?",
      "No. Your files exist only in the request body and process memory for the duration of a single conversion call. Nothing is written to disk, nothing is kept, and there is no account system because there is nothing to attach your files to.",
    ],
    [
      "What gets filtered out?",
      "Dependency folders (node_modules, .venv), caches, build artifacts, model checkpoints, datasets and other large binaries: plus whatever your project's .gitignore excludes. Every rule is listed on the Filters page, and each excluded file shows its reason right in the tree.",
    ],
    [
      "Can I use it on a private repo?",
      "That's the point. You pick a folder from your own machine: repo2nb never sees a repo URL and has no way to reach into anything you didn't explicitly hand it.",
    ],
    [
      "Why is my project too large?",
      "Direct conversion is capped at 4 MB of filtered content so the tool stays fast for everyone. Datasets and model weights should be attached on Kaggle/Colab directly anyway: exclude them and let the notebook fetch or reference them.",
    ],
    [
      "Does the generated notebook run on Kaggle and Colab?",
      "Yes: pick the target before generating. The notebook's first cells contain step-by-step setup instructions for that platform, including how to enable GPU acceleration.",
    ],
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 scroll-mt-20">
      <h2 className="font-display text-3xl tracking-tight mb-8">Questions</h2>
      <div className="divide-y divide-line border-y border-line">
        {qa.map(([q, a], i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-accent"
            >
              {q}
              <span
                aria-hidden
                className={`shrink-0 text-faint transition-transform duration-300 ${open === i ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            <div className={`acc ${open === i ? "open" : ""}`}>
              <div>
                <p className="pb-4 pr-8 text-sm leading-relaxed text-muted">{a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const socials = [
    // personal profiles: these are the author's accounts, not the project's
    { href: "https://github.com/David-Magdy", label: "GitHub", icon: <IconGithub /> },
    { href: "https://www.linkedin.com/in/david-magdy-nagib", label: "LinkedIn", icon: <IconLinkedin /> },
    { href: "https://www.reddit.com/user/PolarIceBear_/", label: "Reddit", icon: <IconReddit /> },
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-10 text-sm">
        <div>
          <Logo />
          <p className="mt-3 text-xs leading-relaxed text-muted max-w-xs">
            Upload any repository to Kaggle and Colab to utilize the power of their GPU resources.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted max-w-xs">
            Prefer the terminal? The{" "}
            <a
              href="https://github.com/repo2nb/repo2nb-cli"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              repo2nb CLI
            </a>{" "}
            came first and does more than this site, which covers basic conversion.
          </p>
          <div className="mt-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-faint mb-1">
              built by david magdy
            </p>
            <div className="flex items-center gap-1">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${s.label} (author's personal profile)`}
                  title={`${s.label}: author's personal profile`}
                  className="p-2 rounded-md text-muted hover:text-fg hover:bg-hover"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 justify-items-end">
          <ul className="space-y-2 text-muted">
            <li className="font-mono text-[11px] uppercase tracking-wide text-faint">Product</li>
            <li><Link href="/#tool" className="hover:text-fg">Home</Link></li>
            <li><Link href="/#how" className="hover:text-fg">How it works</Link></li>
            <li><Link href="/filters" className="hover:text-fg">Filters</Link></li>
          </ul>
          <ul className="space-y-2 text-muted">
            <li className="font-mono text-[11px] uppercase tracking-wide text-faint">Resources</li>
            <li><Link href="/#faq" className="hover:text-fg">FAQ</Link></li>
            <li><Link href="/privacy" className="hover:text-fg">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-faint font-mono">
        no accounts, no storage... install the engine once and convert without a network
      </div>
    </footer>
  );
}
