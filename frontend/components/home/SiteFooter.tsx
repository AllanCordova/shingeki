import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#showcase", label: "Explore" },
      { href: "#workflow", label: "Workflow" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#cta", label: "Pricing" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy" },
      { href: "#", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="px-4 pb-16 pt-12 sm:px-6 lg:px-8" role="contentinfo">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 sm:flex-row sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-foreground">Shingeki</p>
          <p className="mt-2 max-w-xs text-body text-muted-foreground">
            Continuous DAST with intelligent remediation for modern engineering teams.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-10 sm:max-w-md sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition hover:text-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-16 max-w-6xl text-center text-xs text-muted-foreground sm:text-left">
        © {new Date().getFullYear()} Shingeki. All rights reserved.
      </p>
    </footer>
  );
}
