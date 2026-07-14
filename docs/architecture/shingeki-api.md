# shingeki-api

Backend Laravel 13 — API REST com prefixo `/api`, autenticação Sanctum e autorização por policies.

## Camadas

```
app/
  Http/Controllers/     # Auth, Project, System, Attack, SystemResult, Remediation, AiRemediation,
                        # CoverUpload, TargetSession, Catalog* (ataques, medicações, import CSV)
  Http/Middleware/      # EnsureUserRole (ADMIN bypass)
  Http/Requests/        # Validação de entrada (Form Requests + ValidatesCoverSelection)
  Policies/             # Escopo por usuário; CatalogPolicy (ownership + papéis)
  Models/               # User, Project, System, Attack, AttackDispatch, AttackAcknowledgment, SystemResult,
                        # Remediation, SystemTargetSession, CatalogImport, AiRemediationSuggestion, UserCoverUpload
  Services/
    Cover/              # Upload, biblioteca por usuário, paths em storage público
    Attack/             # Catálogo para dispatch, publicação RabbitMQ, processamento de resultados
    TargetSession/      # Sessão autenticada do alvo (headers criptografados)
    CatalogImport/      # Parser CSV, validação por linha, filas RabbitMQ
    Remediation/        # Lookup de snippets por stack e achado
    Ai/                 # LLM clients (Gemini/Groq), prompts, validação de resposta
    Source/             # Contexto de código (GitHub raw, heurística DAST)
  Support/              # AttackAcknowledgmentTerms (versão e código de aceite)
  Enums/                # UserRole, categorias de ataque, risco, local do alvo, status de import
  Console/Commands/     # attacks:consume-results, catalog:consume-imports
```

## Autenticação e autorização

- **Sanctum**: token Bearer em rotas protegidas; registro/login em `/api/auth/*`.
- **Papéis** (`UserRole`): `USER` (padrão), `SPECIALIST` e `ADMIN` gerenciam catálogo global; permissões centralizadas no enum + `CatalogPolicy`.
- **Policies**: escopo por dono do projeto/sistema; catálogo com ownership (specialist só edita o próprio; admin edita qualquer).

## Domínio principal

| Área | Responsabilidade |
|------|------------------|
| Projetos / sistemas | CRUD aninhado; capas via multipart (`cover` ou `cover_upload_id`) |
| Biblioteca de capas | `UserCoverLibraryService` — limite por usuário, reuso e remoção com regras de referência |
| Aceite no dispatch | Body com `accepted_responsibility`, `accepted_legal_terms`, `terms_version`; auditoria em `attack_acknowledgments` |
| Sessão do alvo | `SystemTargetSession` — headers criptografados; popup ou import manual para DAST autenticado |
| Catálogo global | CRUD `/api/catalog/*` + import CSV assíncrono (`catalog:consume-imports`) |
| DAST / SAST | `AttackCatalogService` monta lote (ataques de autores ADMIN/SPECIALIST); `AttackQueuePublisher` publica em RabbitMQ |
| Resultados | `AttackResultsMessageHandler` + `AttackResultProcessor` persistem achados; exclusão em batch |
| Remediação | Catálogo de snippets (`RemediationResolver`) e sugestões IA (`AiRemediationService`) |

## Integração assíncrona

- **Saída**: filas `attacks.dispatch` e `attacks.sast.dispatch` — batch com ataques, `target_url`, metadados do sistema.
- **Entrada**: fila `attacks.results` — uma mensagem por achado; consumida por `attacks:consume-results`.
- **Import CSV**: filas `catalog.attacks.import` e `catalog.remediations.import`; consumidas por `catalog:consume-imports`.

A API não executa varredura no request HTTP: o dispatch retorna `202` com o registro `AttackDispatch` em status pendente.

## Persistência

- Relacionamentos: usuário → projetos → sistemas → dispatches, acknowledgments, resultados.
- Capas: disco `public`, paths `/storage/covers/{uuid}.ext`.
- Configuração de capas: `config/covers.php` (limite de uploads por usuário).

## Contratos com clients

JSON para auth e dispatch (com aceite); `multipart/form-data` para projetos/sistemas com capa. Detalhes de rotas: [API.md](../API.md). Aceite: [ATTACK-ACKNOWLEDGMENT.md](../api/ATTACK-ACKNOWLEDGMENT.md).
