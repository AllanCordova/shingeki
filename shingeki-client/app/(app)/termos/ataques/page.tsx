import Link from "next/link";
import { ATTACK_ACKNOWLEDGMENT } from "@/lib/contracts/attack/attack-acknowledgment";

const TERMS_PARAGRAPHS = [
  "Antes de disparar testes DAST ou SAST, você declara que é responsável pelo sistema alvo e que possui autorização para executar esses testes.",
  "Ataques ou scans contra sistemas sem autorização são de sua responsabilidadé exclusiva. O Shingeki registra o aceite para fins de auditoria.",
  "Ao marcar o aceite na plataforma, você confirma que leu este código de conduta e concorda com as declarações abaixo.",
] as const;

const TERMS_CHECKLIST = [
  "Declaro que sou responsável pelo alvo e tenho autorização para testar este sistema.",
  "Estou ciente de que ataques contra sistemas sem autorização são de minha responsabilidadé exclusiva.",
] as const;

export default function TermosAtaquesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/projetos"
            className="hover:text-foreground hover:underline"
          >
            Projetos
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Termos</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Código de conduta para disparo de ataques
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Código{" "}
          <span className="font-mono text-foreground">
            {ATTACK_ACKNOWLEDGMENT.responsibilityCode}
          </span>
          {" · "}
          Versão{" "}
          <span className="font-mono text-foreground">
            {ATTACK_ACKNOWLEDGMENT.termsVersion}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-app border border-border bg-surface p-5 text-sm leading-relaxed text-muted-foreground">
        {TERMS_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <ul className="list-disc space-y-2 pl-5 text-foreground">
          {TERMS_CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p>
          Se este texto ou o código de aceite forem atualizados, a plataforma
          pedirá um novo aceite antes do próximo disparo em cada sistema.
        </p>
      </div>
    </div>
  );
}
