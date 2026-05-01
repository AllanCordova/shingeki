import { Activity, ScanLine, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const steps: readonly {
  title: string;
  body: string;
  Icon: LucideIcon;
}[] = [
  {
    title: "Scan",
    body: "Configure target and initiate deep crawling.",
    Icon: ScanLine,
  },
  {
    title: "Analyze",
    body: "Engine processes exploit signatures.",
    Icon: Activity,
  },
  {
    title: "Remediate",
    body: "Review and apply suggested code adjustments.",
    Icon: Wrench,
  },
];

export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="relative scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8"
      aria-labelledby="workflow-heading"
    >
      <div className="relative mx-auto max-w-6xl">
        <h2
          id="workflow-heading"
          className="text-subtitle font-semibold tracking-tight text-foreground"
        >
          How Shingeki works
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          A calm pipeline from discovery to fix—no rigid flowcharts required.
        </p>

        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map(({ title, body, Icon }, i) => (
            <li key={title}>
              <div className="group flex h-full flex-col items-center rounded-full border border-border/50 bg-card/60 px-8 py-10 text-center shadow-none ring-0 transition hover:border-primary/30 hover:shadow-primary-glow md:rounded-[2.5rem] md:px-10 md:py-12">
                <div
                  className="mb-4 inline-flex rounded-2xl bg-primary-muted/80 p-3.5 text-primary transition group-hover:bg-primary-muted"
                  aria-hidden
                >
                  <Icon className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Step {i + 1}
                </span>
                <span className="mt-3 text-lg font-semibold text-foreground">{title}</span>
                <p className="mt-2 text-body leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
