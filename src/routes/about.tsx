import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-[2rem] p-6 sm:p-8">
        <p className="island-kicker mb-2">Build Plan</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          How this VPA assistant should grow into production.
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          The homepage now demonstrates the product direction. The next steps are wiring real OpenAI
          chat, syncing Shopify data into Convex, and unlocking secure customer-order support.
        </p>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {[
          [
            "1. Knowledge sync",
            "Pull products, blogs, policy pages, and event content from Shopify into Convex RAG so the assistant answers from live VPA data.",
          ],
          [
            "2. Interactive coaching",
            "Persist workout templates, exercise timers, rep targets, and completed sessions so recommendations improve over time.",
          ],
          [
            "3. Order support",
            "Authenticate the customer first, then expose order lookup, fulfilment updates, and tracking through safe Shopify tools.",
          ],
        ].map(([title, description]) => (
          <article key={title} className="island-shell rounded-[1.6rem] p-5">
            <h2 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">{title}</h2>
            <p className="mt-3 mb-0 text-sm leading-7 text-[var(--sea-ink-soft)]">{description}</p>
          </article>
        ))}
      </section>

      <section className="island-shell mt-8 rounded-[2rem] p-6">
        <p className="island-kicker mb-2">Local Environment</p>
        <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
          Values still needed on this machine
        </h2>
        <p className="mt-3 mb-0 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
          Shopify and OpenAI secrets now live in Convex environment variables. Local development
          only needs the Convex connection values below.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["CONVEX_DEPLOYMENT", "VITE_CONVEX_URL", "VITE_CONVEX_SITE_URL"].map((item) => (
            <div
              key={item}
              className="rounded-[1.2rem] border border-[rgba(23,58,64,0.12)] bg-white/78 px-4 py-3 text-sm font-semibold text-[var(--sea-ink)]"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
