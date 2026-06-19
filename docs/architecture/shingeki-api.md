# shingeki-api

Backend Laravel 13 — API REST com prefixo `/api`, autenticação Sanctum e autorização por policies.

## Camadas

```
app/
  Http/Controllers/     # Auth, Project, System, Signature, Attack, SystemResult, Remediation, AiRemediation, CoverUpload
  Http/Requests/        # Validação de entrada (Form Requests + ValidatesCoverSelection)
  Policies/             # Escopo por usuário dono do projeto/sistema
  Models/               # User, Project, System, Signature, Attack, AttackDispatch, SystemResult, AiRemediationSuggestion, UserCoverUpload
  Services/
    Cover/              # Upload, biblioteca por usuário, paths em storage público
    Signature/          # Geração, validação HTML no alvo, autorização no dispatch (resolve token ativo)
    Attack/             # Catálogo, publicação RabbitMQ, processamento de resultados
    Remediation/        # Lookup de snippets por stack e achado
    Ai/                 # LLM clients (Gemini/Groq), prompts, validação de resposta
    Source/             # Contexto de código (GitHub raw, heurística DAST)
  Enums/                # Categorias de ataque, risco, local do alvo, status de assinatura
  Console/Commands/     # attacks:consume-results (consumer da fila de retorno)
```

## Autenticação e autorização

- **Sanctum**: token Bearer em rotas protegidas; registro/login em `/api/auth/*`.
- **Policies**: `ProjectPolicy`, `SystemPolicy`, `SignaturePolicy`, `AttackPolicy`, `SystemResultPolicy` — recursos aninhados resolvidos por UUID e restritos ao `user_id` dono.

## Domínio principal

| Área | Responsabilidade |
|------|------------------|
| Projetos / sistemas | CRUD aninhado; capas via multipart (`cover` ou `cover_upload_id`) |
| Biblioteca de capas | `UserCoverLibraryService` — limite por usuário, reuso e remoção com regras de referência |
| Assinaturas | Token em meta tag HTML do alvo; dispatch resolve assinatura ativa (sem body) |
| DAST / SAST | `AttackCatalogService` monta lote; `AttackQueuePublisher` publica em RabbitMQ |
| Resultados | `AttackResultsMessageHandler` + `AttackResultProcessor` persistem achados; exclusão em batch |
| Remediação | Catálogo de snippets (`RemediationResolver`) e sugestões IA (`AiRemediationService`) |

## Integração assíncrona

- **Saída**: fila `attacks.dispatch` — batch com ataques, `target_url`, metadados do sistema.
- **Entrada**: fila `attacks.results` — uma mensagem por achado; consumida pelo artisan `attacks:consume-results` (processo longo separado do `queue:listen` HTTP).

A API não executa varredura no request HTTP: o dispatch retorna `202` com o registro `AttackDispatch` em status pendente.

## Persistência

- Relacionamentos: usuário → projetos → sistemas → assinaturas, dispatches, resultados.
- Capas: disco `public`, paths `/storage/covers/{uuid}.ext` (requer `storage:link`).
- Configuração de capas: `config/covers.php` (limite de uploads por usuário).

## Contratos com clients

JSON para auth, assinaturas e dispatch; `multipart/form-data` para projetos/sistemas com capa. Detalhes de rotas: [API.md](../API.md).
