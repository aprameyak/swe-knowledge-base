import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div className="relative z-10 min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="font-display text-2xl tracking-tight">Strand</div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl">
            Strand
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--ink-muted)]">
            A living career memory. Capture what happened in seconds — then
            recall it when resumes, interviews, and reviews need the real
            details.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">Start capturing</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Try the demo
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--ink-faint)]">
            Demo: demo@strand.app / demo1234
          </p>
        </div>

        <div className="animate-fade-up-delay relative grain overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--ink)] p-8 text-[var(--bg-elevated)] shadow-[var(--shadow)] min-h-[360px] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,110,110,0.35),transparent_55%),linear-gradient(160deg,#1a222c,#12161c)]" />
          <div className="relative space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Just captured
            </p>
            <p className="font-display text-2xl leading-snug text-white/95 sm:text-3xl">
              “finally fixed the slow dashboard query today, moved aggregation
              into postgres and it went from around 8 seconds to 2”
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                Metric · 8s → 2s
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                PostgreSQL
              </span>
              <span className="rounded-full bg-teal-400/20 px-2.5 py-1 text-xs text-teal-100">
                From your words
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--bg-elevated)]/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3">
          {[
            {
              title: "Capture first",
              body: "No forms. No taxonomy. Write what happened and save — organize later.",
            },
            {
              title: "Remember, don’t invent",
              body: "Strand asks useful questions and retrieves your own experiences. It never fabricates impact.",
            },
            {
              title: "Useful on a Tuesday",
              body: "Timeline, knowledge views, and recall stay valuable long after any job hunt ends.",
            },
          ].map((item, i) => (
            <div
              key={item.title}
              className={i === 0 ? "animate-fade-up" : i === 1 ? "animate-fade-up-delay" : "animate-fade-up-delay-2"}
            >
              <h2 className="font-display text-2xl text-[var(--ink)]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-[var(--ink-faint)]">
        <span>Strand — professional memory that compounds</span>
        <span>Your words stay the source of truth</span>
      </footer>
    </div>
  );
}
