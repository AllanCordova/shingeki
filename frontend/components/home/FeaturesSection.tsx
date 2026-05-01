import {
  Fingerprint,
  Wrench,
  Signature,
  Activity,
} from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations";

const features = [
  {
    title: "Dynamic Analysis (DAST)",
    body: "Real-time vulnerability exploration without source code access.",
    Icon: Fingerprint,
  },
  {
    title: "Automated Remediation",
    body: "Do not just find flaws—fix them. Receive suggested source code patches instantly.",
    Icon: Wrench,
  },
  {
    title: "Custom Signatures",
    body: "Define and manage specific attack behaviors tailored to your application.",
    Icon: Signature,
  },
  {
    title: "Continuous Monitoring",
    body: "Seamless integration with your CI/CD pipeline.",
    Icon: Activity,
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="features-heading"
          className="text-subtitle font-semibold tracking-tight text-foreground"
        >
          Built for modern AppSec teams
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Soft surfaces, sharp signal—everything you need to ship with confidence.
        </p>

        <StaggerContainer
          whenInView
          className="mt-14 grid gap-6 sm:grid-cols-2"
          stagger={0.08}
        >
          {features.map(({ title, body, Icon }) => (
            <StaggerItem key={title}>
              <article className="group h-full rounded-3xl bg-card/80 p-8 shadow-none transition duration-300 hover:shadow-primary-glow hover:ring-1 hover:ring-primary/25">
                <div
                  className="mb-5 inline-flex rounded-2xl bg-primary-muted/80 p-3.5 text-primary transition group-hover:bg-primary-muted"
                  aria-hidden
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-body leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
