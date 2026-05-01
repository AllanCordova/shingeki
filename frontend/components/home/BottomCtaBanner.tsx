export function BottomCtaBanner() {
  return (
    <section
      id="cta"
      className="scroll-mt-24 px-4 pb-24 pt-8 sm:px-6 lg:px-8"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2.5rem] bg-card px-6 py-12 shadow-primary-glow ring-1 ring-border/40 sm:px-10 sm:py-14">
          <h2
            id="cta-heading"
            className="text-center text-subtitle font-semibold tracking-tight text-foreground"
          >
            Secure your code from the ground up
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-body text-muted-foreground">
            Join the waitlist and we&apos;ll reach out when your workspace is ready.
          </p>
          <form
            className="mx-auto mt-10 flex max-w-lg flex-col gap-3 rounded-full border border-border/60 bg-background/50 p-1.5 sm:flex-row sm:items-stretch"
            action="#"
            method="post"
          >
            <label htmlFor="cta-email" className="sr-only">
              Email address
            </label>
            <input
              id="cta-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="min-h-12 flex-1 rounded-full border-0 bg-transparent px-5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
            <button
              type="submit"
              className="min-h-12 shrink-0 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
