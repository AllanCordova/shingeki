"use client";

import type { AiRemediatedFinding } from "@/lib/contracts";
import { formatFindingSourceLocation } from "@/lib/results/source-location";
import { safeExternalUrl } from "@/lib/urls";
import { ScanTypeBadge } from "@/components/results/scan-type-badge";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

function confidenceTone(
  confidence: string,
): "success" | "warning" | "neutral" {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "neutral";
}

export function AiRemediationFindingCard({
  finding,
}: {
  finding: AiRemediatedFinding;
}) {
  const suggestion = finding.ai_suggestion;
  const isSast = finding.scan_type === "SAST";
  const sourceLocation =
    formatFindingSourceLocation(finding) ??
    (finding.source_context.file && finding.source_context.line
      ? `${finding.source_context.file}:${finding.source_context.line}`
      : null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            {finding.attack?.category ?? "Vulnerabilidade"}
          </CardTitle>
          {finding.scan_type ? (
            <ScanTypeBadge scanType={finding.scan_type} />
          ) : null}
          <Badge tone={confidenceTone(suggestion.validation.confidence)}>
            Confianca {suggestion.validation.confidence}
          </Badge>
          {finding.cached ? <Badge tone="neutral">Cache</Badge> : null}
          {suggestion.validation.syntax_valid ? (
            <Badge tone="success">Sintaxe valida</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {sourceLocation ? (
          <Detail
            label={isSast ? "Arquivo e linha(s)" : "Local"}
            value={sourceLocation}
            mono={isSast}
          />
        ) : finding.vulnerable_route ? (
          <Detail label="Local" value={finding.vulnerable_route} />
        ) : null}
        {finding.payload_used ? (
          <Detail
            label={isSast ? "Regra" : "Payload"}
            value={finding.payload_used}
            mono
          />
        ) : null}

        <Detail label="Causa raiz" value={suggestion.root_cause} />
        <Detail label="Risco" value={suggestion.risk_summary} />

        <Detail
          label={`Código fonte (${finding.source_context.origin})`}
          value={finding.source_context.excerpt}
          mono
        />

        <div className="flex flex-col gap-2 rounded-app border border-border p-3">
          <span className="font-medium text-foreground">
            Correção sugerida
          </span>
          <p className="text-muted-foreground">
            {suggestion.suggested_fix.description}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-app bg-surface-muted p-3 font-mono text-xs text-foreground">
            {suggestion.suggested_fix.code}
          </pre>
          <p className="text-xs text-muted-foreground">
            {suggestion.validation.why_this_fixes}
          </p>
        </div>

        {suggestion.references.length > 0 ? (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {suggestion.references.map((reference) => {
              const href = safeExternalUrl(reference);
              return (
                <li key={reference}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      {reference}
                    </a>
                  ) : (
                    reference
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words rounded-app bg-surface-muted p-3 text-foreground ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}
