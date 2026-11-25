import { cn } from "@/lib/utils";

export function CatalogCoverageNote({ className }: { className?: string }) {
  return (
    <details
      className={cn(
        "rounded-app border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <summary className="cursor-pointer font-medium text-foreground">
        O que este scan não cobre
      </summary>
      <p className="mt-2">
        O scanner confirma as classes do catálogo: SQL, XSS, path traversal,
        SSRF, XXE, SSTI, open redirect, JWT, IDOR, CSRF, NoSQL, LDAP, command
        injection e vazamento de segredo.
      </p>
      <p className="mt-2">
        Ficam de fora lógica de negócio, CAPTCHA, segundo fator, Web3,
        criptografia, esteganografia, prompt injection, clickjacking, CORS,
        prototype pollution e template injection no cliente.
      </p>
    </details>
  );
}
