"use client";

import { Faq, Footer, Nav } from "@/components/chrome";
import { Reveal } from "@/components/reveal";

const ENDPOINTS = [
  {
    route: "POST /api/scan",
    receives: "only the files you checked (after client-side filtering)",
    returns: "include/exclude decision per file, with the rule that caused it",
    keeps: "nothing",
  },
  {
    route: "POST /api/generate",
    receives: "the files you checked, your selection, and the target (kaggle/colab)",
    returns: "the notebook JSON you download",
    keeps: "nothing",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-3xl tracking-tight">Privacy: don&apos;t take our word for it</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every privacy policy asks for trust. This page is different: it tells you exactly
          what happens to your files and how to verify each claim yourself, in about two
          minutes, with browser tools you already have.
        </p>

        {/* offline */}
        <Reveal>
          <section className="mt-12">
            <h2 className="font-display text-xl tracking-tight">1. Your code never has to leave your machine</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              After your first visit, the entire conversion engine is installed in your
              browser (via WebAssembly) and cached by a service worker. You can turn off
              your internet and run the whole flow: pick a folder, review the tree,
              generate and download the notebook. Zero network required.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The top bar shows it happening: <span className="font-mono text-fg">caching…</span> while the
              engine downloads itself in the background (~6 MB, one time; skipped on metered
              connections), then <span className="font-mono text-ok">offline ready</span>. After that,
              airplane mode is fair game.
            </p>
            <div className="card mt-4 rounded-lg p-5 font-mono text-[13px] leading-relaxed">
              <p className="text-faint"># verify it yourself</p>
              <p>1. Load this site and wait for <span className="text-ok">offline ready</span> in the top bar</p>
              <p>2. DevTools (F12) → Network tab → check <span className="text-fg">Offline</span></p>
              <p>3. Convert a folder, download the notebook</p>
              <p>4. Everything works. No requests leave your machine.</p>
            </div>
          </section>
        </Reveal>

        {/* server path */}
        <Reveal>
          <section className="mt-12">
            <h2 className="font-display text-xl tracking-tight">2. If you use the server path instead</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              On first use (or in browsers without WebAssembly), conversion runs on our
              server. Here is the complete list of what that means:
            </p>
            <div className="card mt-4 overflow-x-auto rounded-xl">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wide text-faint">
                    <th className="py-2 pl-4 pr-4">Endpoint</th>
                    <th className="py-2 pr-4">Receives</th>
                    <th className="py-2 pr-4">Returns</th>
                    <th className="py-2 pr-4">Stored</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={e.route} className="border-b border-line align-top last:border-b-0">
                      <td className="py-3 pl-4 pr-4 font-mono text-fg">{e.route}</td>
                      <td className="py-3 pr-4 text-muted">{e.receives}</td>
                      <td className="py-3 pr-4 text-muted">{e.returns}</td>
                      <td className="py-3 pr-4 font-mono text-ok">{e.keeps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              There is no database, no file storage, and no account system, because there is
              nothing to attach your files to. Server logs contain counts and byte sizes
              only: never file names, never contents. You can watch the server&apos;s entire
              view of your request in the repository&apos;s{" "}
              <code className="font-mono text-fg bg-hover px-1 rounded">api/handlers.py</code> — it is a hundred lines.
            </p>
          </section>
        </Reveal>

        {/* analytics */}
        <Reveal>
          <section className="mt-12">
            <h2 className="font-display text-xl tracking-tight">3. Analytics</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Cookieless, anonymous page counts plus four conversion-funnel events:
            </p>
            <pre className="card mt-3 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto">
{`folder_selected
tree_previewed    { file_count, target }   // a number and "kaggle"/"colab"
notebook_generated
notebook_downloaded`}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No file names, no paths, no contents, no notebook names, no cookies, no
              cross-site tracking. That is the complete list.
            </p>
          </section>
        </Reveal>

        {/* no third parties */}
        <Reveal>
          <section className="mt-12">
            <h2 className="font-display text-xl tracking-tight">4. No third parties, ever</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Open DevTools → Network on any page of this site and group by domain: you will
              see only this site&apos;s own origin. The conversion engine and its Python
              runtime are served from here too — no CDN, no ads, no trackers, no
              font CDNs, no social widgets.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              And since the whole thing is open source, the strongest verification is
              reading it: the engine is{" "}
              <code className="font-mono text-fg bg-hover px-1 rounded">packages/repo2nb_core</code>,
              the browser plumbing is{" "}
              <code className="font-mono text-fg bg-hover px-1 rounded">apps/web/lib</code>,
              and the service worker is{" "}
              <code className="font-mono text-fg bg-hover px-1 rounded">apps/web/public/sw.js</code>.
            </p>
          </section>
        </Reveal>
      </main>
      <Faq />
      <Footer />
    </>
  );
}
