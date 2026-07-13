<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Relatório de Auditoria — {{ $project['name'] }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1a1a1a;
            line-height: 1.45;
        }
        .page { padding: 28px 32px; }
        .cover {
            background: #111827;
            color: #f9fafb;
            padding: 32px;
            margin: -28px -32px 28px;
        }
        .cover-brand {
            font-size: 10px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #9ca3af;
            margin-bottom: 12px;
        }
        .cover h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .cover-subtitle {
            font-size: 13px;
            color: #d1d5db;
            margin-bottom: 20px;
        }
        .meta-grid {
            width: 100%;
            border-collapse: collapse;
        }
        .meta-grid td {
            padding: 5px 0;
            vertical-align: top;
        }
        .meta-label {
            width: 34%;
            color: #9ca3af;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .meta-value { color: #f3f4f6; }
        .section {
            margin-bottom: 22px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #111827;
            border-bottom: 2px solid #111827;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .summary-table th,
        .summary-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            text-align: left;
        }
        .summary-table th {
            background: #f3f4f6;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #4b5563;
        }
        .risk-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .risk-high { background: #fee2e2; color: #991b1b; }
        .risk-medium { background: #fef3c7; color: #92400e; }
        .risk-low { background: #e5e7eb; color: #374151; }
        .risk-unknown { background: #f3f4f6; color: #6b7280; }
        .finding {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 14px;
            page-break-inside: avoid;
        }
        .finding-header {
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 12px;
        }
        .finding-title {
            font-size: 12px;
            font-weight: 700;
            color: #111827;
        }
        .finding-meta {
            margin-top: 4px;
            font-size: 10px;
            color: #6b7280;
        }
        .finding-body { padding: 10px 12px; }
        .field { margin-bottom: 10px; }
        .field-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 3px;
        }
        .field-value {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 8px;
            font-family: DejaVu Sans Mono, monospace;
            font-size: 9px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .coverage-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 12px;
        }
        .coverage-box p { margin-bottom: 8px; }
        .detail-url {
            color: #1d4ed8;
            word-break: break-all;
            font-size: 10px;
        }
        .empty-state {
            color: #6b7280;
            font-style: italic;
            padding: 8px 0;
        }
        .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
        }
    </style>
</head>
<body>
<div class="page">
    <div class="cover">
        <div class="cover-brand">Shingeki</div>
        <h1>Relatório de Auditoria</h1>
        <p class="cover-subtitle">Evidências de teste de segurança para revisão e conformidade</p>
        <table class="meta-grid">
            <tr>
                <td class="meta-label">Projeto</td>
                <td class="meta-value">{{ $project['name'] }}</td>
            </tr>
            <tr>
                <td class="meta-label">Sistema</td>
                <td class="meta-value">{{ $system['name'] }}</td>
            </tr>
            @if ($system['target_url'])
                <tr>
                    <td class="meta-label">Alvo</td>
                    <td class="meta-value">{{ $system['target_url'] }}</td>
                </tr>
            @endif
            @if ($system['repository_url'])
                <tr>
                    <td class="meta-label">Repositório</td>
                    <td class="meta-value">{{ $system['repository_url'] }}</td>
                </tr>
            @endif
            <tr>
                <td class="meta-label">Tipo de scan</td>
                <td class="meta-value">{{ $dispatch['scan_type'] }}</td>
            </tr>
            <tr>
                <td class="meta-label">Disparo</td>
                <td class="meta-value">{{ $dispatch['id'] }}</td>
            </tr>
            <tr>
                <td class="meta-label">Executado em</td>
                <td class="meta-value">{{ $dispatch['dispatched_at']?->timezone(config('app.timezone'))->format('d/m/Y H:i:s') }}</td>
            </tr>
            @if ($dispatch['completed_at'])
                <tr>
                    <td class="meta-label">Concluído em</td>
                    <td class="meta-value">{{ $dispatch['completed_at']->timezone(config('app.timezone'))->format('d/m/Y H:i:s') }}</td>
                </tr>
            @endif
            @if ($dispatch['duration_label'])
                <tr>
                    <td class="meta-label">Duração</td>
                    <td class="meta-value">{{ $dispatch['duration_label'] }}</td>
                </tr>
            @endif
            @if ($executed_by['name'] || $executed_by['email'])
                <tr>
                    <td class="meta-label">Executado por</td>
                    <td class="meta-value">
                        {{ trim(($executed_by['name'] ?? '') . ($executed_by['email'] ? ' <' . $executed_by['email'] . '>' : '')) }}
                    </td>
                </tr>
            @endif
        </table>
    </div>

    <div class="section">
        <h2 class="section-title">Resumo executivo</h2>
        <table class="summary-table">
            <tr>
                <th>Ataques no catálogo</th>
                <th>Vulnerabilidades</th>
                @if ($is_dast)
                    <th>Probes executados</th>
                @endif
            </tr>
            <tr>
                <td>{{ $dispatch['attacks_count'] }}</td>
                <td>{{ $dispatch['findings_count'] }}</td>
                @if ($is_dast)
                    <td>{{ $dispatch['probes_count'] ?? ($probe_counts['all'] ?? 0) }}</td>
                @endif
            </tr>
        </table>

        <table class="summary-table">
            <tr>
                <th>Alto</th>
                <th>Médio</th>
                <th>Baixo</th>
                @if ($risk_summary['UNKNOWN'] > 0)
                    <th>Sem classificação</th>
                @endif
            </tr>
            <tr>
                <td>{{ $risk_summary['HIGH'] }}</td>
                <td>{{ $risk_summary['MEDIUM'] }}</td>
                <td>{{ $risk_summary['LOW'] }}</td>
                @if ($risk_summary['UNKNOWN'] > 0)
                    <td>{{ $risk_summary['UNKNOWN'] }}</td>
                @endif
            </tr>
        </table>

        @if ($is_dast && ($dispatch['vectors_discovered'] !== null || $dispatch['jobs_planned'] !== null))
            <p style="margin-top: 8px; color: #4b5563;">
                @if ($dispatch['vectors_discovered'] !== null)
                    {{ $dispatch['vectors_discovered'] }} rota(s) descoberta(s)
                @endif
                @if ($dispatch['jobs_planned'] !== null)
                    · {{ $dispatch['jobs_planned'] }} teste(s) planejado(s)
                @endif
            </p>
        @endif
    </div>

    <div class="section">
        <h2 class="section-title">Vulnerabilidades confirmadas ({{ count($findings) }})</h2>

        @if (count($findings) === 0)
            <p class="empty-state">Nenhuma vulnerabilidade foi detectada neste disparo.</p>
        @else
            @foreach ($findings as $index => $finding)
                <div class="finding">
                    <div class="finding-header">
                        <div class="finding-title">
                            {{ $index + 1 }}. {{ $finding['category'] }}
                        </div>
                        <div class="finding-meta">
                            @if ($finding['risk_level'])
                                @php
                                    $riskClass = match ($finding['risk_level']) {
                                        'HIGH' => 'risk-high',
                                        'MEDIUM' => 'risk-medium',
                                        'LOW' => 'risk-low',
                                        default => 'risk-unknown',
                                    };
                                @endphp
                                <span class="risk-pill {{ $riskClass }}">{{ $finding['risk_level'] }}</span>
                            @endif
                            @if ($finding['target_location'])
                                · {{ $finding['target_location'] }}
                            @endif
                        </div>
                    </div>
                    <div class="finding-body">
                        @if ($finding['source_location'])
                            <div class="field">
                                <div class="field-label">{{ $finding['location_label'] }}</div>
                                <div class="field-value">{{ $finding['source_location']['label'] ?? '' }}</div>
                            </div>
                        @elseif ($finding['vulnerable_route'] && ! $finding['is_sast'])
                            <div class="field">
                                <div class="field-label">Rota vulnerável</div>
                                <div class="field-value">{{ $finding['vulnerable_route'] }}</div>
                            </div>
                        @endif

                        @if ($finding['payload_used'])
                            <div class="field">
                                <div class="field-label">{{ $finding['payload_label'] }}</div>
                                <div class="field-value">{{ $finding['payload_used'] }}</div>
                            </div>
                        @endif

                        @if ($finding['matched_snippet'])
                            <div class="field">
                                <div class="field-label">Trecho afetado</div>
                                <div class="field-value">{{ $finding['matched_snippet'] }}</div>
                            </div>
                        @endif

                        @if ($finding['evidence'])
                            <div class="field">
                                <div class="field-label">Evidência</div>
                                <div class="field-value">{{ $finding['evidence'] }}</div>
                            </div>
                        @endif

                        @if ($finding['http_request'])
                            <div class="field">
                                <div class="field-label">{{ $finding['http_label'] }}</div>
                                <div class="field-value">{{ $finding['http_request'] }}</div>
                            </div>
                        @endif
                    </div>
                </div>
            @endforeach
        @endif
    </div>

    @if ($is_dast && $probe_counts)
        <div class="section">
            <h2 class="section-title">Cobertura de testes (DAST)</h2>
            <div class="coverage-box">
                <p>
                    <strong>{{ $probe_counts['all'] }}</strong> probe(s) executado(s):
                    <strong>{{ $probe_counts['vulnerable'] }}</strong> vulnerável(is),
                    <strong>{{ $probe_counts['clean'] }}</strong> limpo(s),
                    <strong>{{ $probe_counts['error'] }}</strong> erro(s).
                </p>
                <p>
                    O log completo de cobertura (todos os testes individuais) não está incluído neste PDF
                    para manter o documento conciso. Acesse o sistema para revisar cada probe em detalhe:
                </p>
                <p class="detail-url">{{ $detail_url }}</p>
            </div>
        </div>
    @endif

    <div class="footer">
        Gerado em {{ $generated_at->timezone(config('app.timezone'))->format('d/m/Y H:i:s') }}
        · {{ config('app.name') }}
        · Documento para uso interno de auditoria
    </div>
</div>
</body>
</html>
