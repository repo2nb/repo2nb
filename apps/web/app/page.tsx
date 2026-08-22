import { Faq, Footer, Nav } from "@/components/chrome";
import { IconColab, IconKaggle } from "@/components/icons";
import { Picker } from "@/components/picker";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* hero = the tool itself */}
        <section id="tool" className="relative">
          <div className="dotgrid pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-5 pt-16 pb-10">
            <h1 className="rise font-display text-center text-4xl sm:text-5xl font-medium tracking-tight text-balance">
              Any repo. <span className="accent-text">One notebook.</span>
            </h1>
            <p className="rise mt-3 text-center text-muted text-balance" style={{ animationDelay: "60ms" }}>
              Turn a project folder into a GPU-ready Kaggle or Colab notebook. No CLI, no clone step, no account.
            </p>
            <div className="rise mt-8" style={{ animationDelay: "120ms" }}>
              <Picker />
            </div>
            {/* target row */}
            <div className="rise mt-10 text-center" style={{ animationDelay: "180ms" }}>
              <p className="text-sm text-muted">
                Works with your favourite <span className="text-fg">data science</span> and{" "}
                <span className="text-fg">machine learning</span> platforms, seamlessly.
              </p>
              <div className="mt-5 flex items-center justify-center gap-12">
                <a
                  href="https://www.kaggle.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Kaggle"
                  title="Kaggle"
                  className="text-faint transition-all duration-300 hover:text-accent hover:drop-shadow-[0_0_12px_rgba(239,80,51,0.55)] hover:-translate-y-0.5"
                >
                  <IconKaggle className="size-11" />
                </a>
                <a
                  href="https://colab.research.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Google Colab"
                  title="Google Colab"
                  className="text-faint transition-all duration-300 hover:text-accent hover:drop-shadow-[0_0_12px_rgba(239,80,51,0.55)] hover:-translate-y-0.5"
                >
                  <IconColab className="size-11" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mx-auto max-w-3xl px-5 py-20 space-y-16">
          {[
            {
              n: "01",
              title: "Smart filtering",
              body: "node_modules, virtualenvs, caches, checkpoints and datasets never make it into your notebook. Your .gitignore is respected too: and a .repo2nbignore can override any default.",
              mock: (
                <div className="font-mono text-xs space-y-1 p-4 rounded-lg border border-line bg-panel">
                  <p><span className="text-ok">✓</span> src/train.py</p>
                  <p><span className="text-ok">✓</span> requirements.txt</p>
                  <p className="text-faint line-through">node_modules/react/index.js <span className="no-underline"> dependency folder</span></p>
                  <p className="text-faint line-through">checkpoints/last.ckpt <span className="no-underline"> model checkpoint</span></p>
                </div>
              ),
            },
            {
              n: "02",
              title: "Review every byte",
              body: "The tree preview shows what's in and what's out: with live size budgeting so you never hit an upload wall mid-task. Toggle anything; large files are unchecked for review by default.",
              mock: (
                <div className="font-mono text-xs space-y-1 p-4 rounded-lg border border-line bg-panel">
                  <p>1.9 MB / 4 MB ▮▮▮▮▮▯▯▯▯▯</p>
                  <p className="text-faint mt-2">largest included:</p>
                  <p className="flex justify-between"><span>src/model.py</span><span>48.2 KB</span></p>
                </div>
              ),
            },
            {
              n: "03",
              title: ".repo2nbignore support",
              body: "Same syntax you already know from .gitignore: drop one in your project root to change repo2nb's defaults for everyone who converts that repo. Or export your session tweaks as one when you're done.",
              mock: (
                <pre className="font-mono text-xs p-4 rounded-lg border border-line bg-panel leading-relaxed">
{`# keep one checkpoint
!checkpoints/final.ckpt
# skip noisy logs
docs/drafts/`}
                </pre>
              ),
            },
          ].map((f) => (
            <div key={f.n} className={`grid md:grid-cols-2 gap-8 items-center ${f.n === "02" ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <span className="font-mono text-xs text-accent">{f.n}</span>
                <h3 className="mt-2 font-display text-2xl tracking-tight">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
              {f.mock}
            </div>
          ))}
        </section>

        <Faq />
      </main>
      <Footer />
    </>
  );
}
