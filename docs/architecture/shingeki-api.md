# API (`apps/api`)

Backend Laravel 13 — API REST com prefixo `/api`, autenticação Sanctum, policies e GraphQL (Lighthouse) em `POST /graphql`.

Contratos HTTP: [API.md](../API.md). Como rodar: [RUN-PROJECT.md](../RUN-PROJECT.md).

## Camadas

```
app/
  Http/Controllers/     # Auth (+ Google), Admin, Project, System (CRUD + OwnedSystem),
                        # Attack, SystemResult, Audit, Remediation (+ AI, GitHub, History),
                        # CoverUpload, TargetSession, ManualProxy, Notification, Catalog*
  Http/Middleware/      # EnsureUserRole (ADMIN bypass)
  Http/Requests/        # Form Requests + ValidatesCoverSelection
  Policies/             # Escopo por dono; CatalogPolicy (ownership + papéis)
  Models/               # User, Project, System, Attack, AttackDispatch, AttackAcknowledgment,
                        # SystemResult, DispatchProbe, Remediation, SystemTargetSession,
                        # CatalogImport, AiRemediationSuggestion, UserCoverUpload, …
  GraphQL/              # Query/mutation da sidebar (Lighthouse)
  Services/
    Cover/              # Upload, biblioteca, avatar
    Attack/             # Catálogo para dispatch, RabbitMQ, resultados e probes
    TargetSession/      # Sessão autenticada do alvo (headers criptografados)
    CatalogImport/      # Parser CSV, validação por linha, filas
    Remediation/        # Snippets por stack; patches GitHub
    Ai/                 # LLM (Gemini/Groq)
    Source/             # Contexto de código (GitHub raw, heurística DAST)
    Project/            # Dashboard agregado
    Results/            # Comparação entre dispatches
    Audit/              # Relatório PDF
    GitHub/             # Cliente HTTP do GitHub
  Support/              # AttackAcknowledgmentTerms
  Enums/                # UserRole, categorias, risco, profundidade, outcome de probe, …
  Console/Commands/     # attacks:consume-results, catalog:consume-imports
graphql/                # schema.graphql + sidebar.graphql
```

## Autenticação e autorização

- **Sanctum**: token Bearer em rotas `/api/*` protegidas; registro/login/Google em `/api/auth/*`.
- **Papéis**: fonte única em [AUTHENTICATION.md](../api/AUTHENTICATION.md).
- **Policies**: escopo por dono do projeto/sistema; catálogo com ownership (specialist só edita o próprio; admin edita qualquer).

## REST vs GraphQL

- **Padrão: REST** — CRUD, dispatch, resultados, remediação, catálogo.
- **GraphQL** (`POST /graphql`, `@guard` Sanctum): composição da sidebar (`sidebarNavigation` + `syncSidebarNavigation`) — preferências (`items`) + árvore visível (`tree`) + `meta` num schema tipado.
- O BFF expõe `POST /api/graphql` e encaminha o body; o browser não chama `/graphql` direto.

Schema: `apps/api/graphql/`. Não migrar o restante da API para GraphQL — ver `AGENT/architecture.md`.

## Domínio principal

| Área | Responsabilidade |
|------|------------------|
| Projetos / sistemas | CRUD aninhado; `login_url`; capas; dashboard; lista plana `/api/systems`; settings DAST persistidos |
| Biblioteca de capas | `UserCoverLibraryService` — limite por usuário, reuso, avatar |
| Aceite no dispatch | Body com `accepted_responsibility`, `accepted_legal_terms`, `terms_version`; auditoria em `attack_acknowledgments` |
| Sessão do alvo | `SystemTargetSession` — headers criptografados; extensão, popup ou import manual |
| Catálogo global | CRUD `/api/catalog/*` + import CSV assíncrono (`catalog:consume-imports`) |
| DAST / SAST | `AttackCatalogService` monta lote (autores ADMIN/SPECIALIST); `AttackQueuePublisher` publica em RabbitMQ |
| Resultados | Achados (`SystemResult`) + probes (`DispatchProbe`); comparação e export PDF |
| Remediação | Snippets (`RemediationResolver`), sugestões IA, preview/abertura de PR no GitHub |

## Integração assíncrona

- **Saída**: filas `attacks.dispatch` e `attacks.sast.dispatch`.
- **Entrada**: fila `attacks.results` — achados, probes (`attack.probe`) e conclusão (`attack.dispatch.completed`); consumida por `attacks:consume-results`.
- **Import CSV**: filas `catalog.attacks.import` e `catalog.remediations.import`; consumidas por `catalog:consume-imports`.

A API não executa varredura no request HTTP: o dispatch retorna `202` com `AttackDispatch` pendente.

## Persistência

- Relacionamentos: usuário → projetos → sistemas → dispatches, acknowledgments, resultados, probes.
- Capas e avatares: disco `public`, paths `/storage/covers/{uuid}.ext`.
- Configuração de capas: `config/covers.php`.

## Contratos com clients

JSON para a maioria das rotas; `multipart/form-data` para projetos/sistemas com capa e para avatar em `PUT /api/auth/me`. Detalhes: [API.md](../API.md).
