import { Faq, Footer, Nav } from "@/components/chrome";
import { IconColab, IconKaggle } from "@/components/icons";
import { Picker } from "@/components/picker";
import { Reveal } from "@/components/reveal";

function MockShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex items-center gap-1.5 border-b border-line bg-hover/60 px-4 py-2.5">
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="ml-2 font-mono text-[11px] text-faint">{name}</span>
      </div>
      <div className="p-4 font-mono text-xs leading-relaxed">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* hero = the tool itself */}
        <section id="tool" className="relative scroll-mt-20">
          <div className="dotgrid pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden />
          {/* single accent glow behind the picker */}
          <div
            className="pointer-events-none absolute left-1/2 top-40 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-5 pt-16 pb-10">
            <h1 className="rise font-display text-center text-5xl sm:text-6xl font-medium tracking-tight text-balance">
              Any repo. <span className="accent-text">One notebook.</span>
            </h1>
            <p className="rise mt-4 text-center text-muted text-balance" style={{ animationDelay: "60ms" }}>
              Turn a project folder into a GPU-ready Kaggle or Colab notebook. No CLI, no clone step, no account.
            </p>
            <div className="rise mt-10" style={{ animationDelay: "120ms" }}>
              <Picker />
            </div>
            {/* target row */}
            <Reveal className="mt-12 text-center" delay={200}>
              <div className="flex items-center justify-center gap-10">
                <a
                  href="https://www.kaggle.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Kaggle"
                  title="Kaggle"
                  className="text-faint transition-all duration-300 hover:-translate-y-0.5 hover:text-accent"
                >
                  <IconKaggle className="size-9" />
                </a>
                <span className="h-px w-10 bg-line" aria-hidden />
                <a
                  href="https://colab.research.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Google Colab"
                  title="Google Colab"
                  className="text-faint transition-all duration-300 hover:-translate-y-0.5 hover:text-accent"
                >
                  <IconColab className="size-9" />
                </a>
              </div>
              <p className="mt-3 text-xs text-faint">notebooks open directly on Kaggle and Colab</p>
            </Reveal>
          </div>
        </section>

        {/* how it works: one full-width band, then a two-up grid (varied composition) */}
        <section id="how" className="mx-auto max-w-5xl px-5 py-24 scroll-mt-20">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-balance">From folder to notebook</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Three things happen between picking a folder and downloading the file. All of them are visible to you.
            </p>
          </Reveal>

          <Reveal className="mt-14 grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <span className="font-mono text-xs text-accent">01</span>
              <h3 className="mt-2 font-display text-2xl tracking-tight">Smart filtering</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                node_modules, virtualenvs, caches, checkpoints and datasets never make it into your notebook. Your
                .gitignore is respected too: and a .repo2nbignore can override any default.
              </p>
            </div>
            <MockShell name="tree preview">
              <p><span className="text-ok">✓</span> src/train.py</p>
              <p><span className="text-ok">✓</span> requirements.txt</p>
              <p className="text-faint line-through">node_modules/react/index.js <span className="no-underline"> dependency folder</span></p>
              <p className="text-faint line-through">checkpoints/last.ckpt <span className="no-underline"> model checkpoint</span></p>
            </MockShell>
          </Reveal>

          <div className="mt-20 grid gap-10 md:grid-cols-2 md:gap-8">
            <Reveal>
              <span className="font-mono text-xs text-accent">02</span>
              <h3 className="mt-2 font-display text-2xl tracking-tight">Review every byte</h3>
              <p className="mt-3 mb-6 text-sm leading-relaxed text-muted">
                The tree preview shows what&apos;s in and what&apos;s out: with live size budgeting so you never hit an
                upload wall mid-task. Toggle anything; large files are unchecked for review by default.
              </p>
              <MockShell name="size budget">
                <p>1.9 MB / 4 MB ▮▮▮▮▮▯▯▯▯▯</p>
                <p className="text-faint mt-2">largest included:</p>
                <p className="flex justify-between"><span>src/model.py</span><span>48.2 KB</span></p>
              </MockShell>
            </Reveal>
            <Reveal delay={90}>
              <span className="font-mono text-xs text-accent">03</span>
              <h3 className="mt-2 font-display text-2xl tracking-tight">.repo2nbignore support</h3>
              <p className="mt-3 mb-6 text-sm leading-relaxed text-muted">
                Same syntax you already know from .gitignore: drop one in your project root to change repo2nb&apos;s
                defaults for everyone who converts that repo. Or export your session tweaks as one when you&apos;re done.
              </p>
              <MockShell name=".repo2nbignore">
                <pre className="whitespace-pre-wrap">{`# keep one checkpoint
!checkpoints/final.ckpt
# skip noisy logs
docs/drafts/`}</pre>
              </MockShell>
            </Reveal>
          </div>
        </section>

        <Faq />
      </main>
      <Footer />
    </>
  );
}
