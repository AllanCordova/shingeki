# Módulos da disciplina utilizados

Este documento descreve os **cinco módulos** da disciplina aplicados na implementação do Shingeki. Os detalhes abaixo indicam onde cada conceito aparece no monorepo.

## Lista dos módulos

1. **[07 — Forms e Validação de Requisições](#07--forms-e-validação-de-requisições)**
2. **[08 — Autenticação de Usuários](#08--autenticação-de-usuários)**
3. **[09 — Migrações e Relacionamentos](#09--migrações-e-relacionamentos)**
4. **[10 — Integridade e Integração](#10--integridade-e-integração)**
5. **[11 — Autorização com Policies e Testes de Feature](#11--autorização-com-policies-e-testes-de-feature)**

---

## 07 — Forms e Validação de Requisições

Validação de entrada da API com **Form Request** classes, antes de a lógica chegar aos controllers.

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Cadastro e login | [`shingeki-api/app/Http/Requests/AuthRegister.php`](shingeki-api/app/Http/Requests/AuthRegister.php), [`AuthLogin.php`](shingeki-api/app/Http/Requests/AuthLogin.php), [`AuthUpdate.php`](shingeki-api/app/Http/Requests/AuthUpdate.php) |
| Projetos e sistemas | [`ProjectCreate.php`](shingeki-api/app/Http/Requests/ProjectCreate.php), [`ProjectUpdate.php`](shingeki-api/app/Http/Requests/ProjectUpdate.php), [`SystemCreate.php`](shingeki-api/app/Http/Requests/SystemCreate.php), [`SystemUpdate.php`](shingeki-api/app/Http/Requests/SystemUpdate.php) |
| Disparo de ataques | [`AttackDispatch.php`](shingeki-api/app/Http/Requests/AttackDispatch.php) |

---

## 08 — Autenticação de Usuários

Registro, login, logout e perfil com **Laravel Sanctum** (tokens de API em `personal_access_tokens`).

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Controller de autenticação | [`shingeki-api/app/Http/Controllers/AuthController.php`](shingeki-api/app/Http/Controllers/AuthController.php) |
| Rotas `/api/auth/*` | [`shingeki-api/routes/api.php`](shingeki-api/routes/api.php) |
| Modelo de usuário | [`shingeki-api/app/Models/User.php`](shingeki-api/app/Models/User.php) |
| Testes de autenticação | [`shingeki-api/tests/Feature/`](shingeki-api/tests/Feature/) (fluxos que exigem token Sanctum) |

---

## 09 — Migrações e Relacionamentos

Modelos com migrações, relacionamentos Eloquent, factories e seeders (UUIDs, chaves estrangeiras).

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Migrações | [`shingeki-api/database/migrations/`](shingeki-api/database/migrations/) |
| Modelos | [`User`](shingeki-api/app/Models/User.php), [`Project`](shingeki-api/app/Models/Project.php), [`System`](shingeki-api/app/Models/System.php), [`Signature`](shingeki-api/app/Models/Signature.php), [`Attack`](shingeki-api/app/Models/Attack.php), [`AttackDispatch`](shingeki-api/app/Models/AttackDispatch.php), [`SystemResult`](shingeki-api/app/Models/SystemResult.php) |
| Factories e seeders | [`shingeki-api/database/factories/`](shingeki-api/database/factories/), [`shingeki-api/database/seeders/`](shingeki-api/database/seeders/) |

---

## 10 — Integridade e Integração

Assinaturas digitais de autorização de teste, filas **RabbitMQ**, integração com alvo vulnerável de laboratório e processamento assíncrono de resultados DAST.

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Assinaturas (geração, validação, revogação) | [`SignatureController`](shingeki-api/app/Http/Controllers/SignatureController.php), [`SignatureService`](shingeki-api/app/Services/Signature/) |
| Filas e consumo de resultados | [`AttackQueuePublisher`](shingeki-api/app/Services/Attack/AttackQueuePublisher.php), [`ConsumeAttackResultsCommand`](shingeki-api/app/Console/Commands/ConsumeAttackResultsCommand.php), [`config/queue.php`](shingeki-api/config/queue.php) |
| Worker DAST (Go) | [`shingeki-dast-worker/`](shingeki-dast-worker/) |
| Alvo vulnerável (PHP) | [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) |
| Orquestração local | [`docker-compose.yml`](docker-compose.yml) na raiz do monorepo |

---

## 11 — Autorização com Policies e Testes de Feature

**Policies** para autorizar ações por recurso e suíte de testes com **Pest** (feature e unit).

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Policies | [`ProjectPolicy`](shingeki-api/app/Policies/ProjectPolicy.php), [`SystemPolicy`](shingeki-api/app/Policies/SystemPolicy.php), [`SignaturePolicy`](shingeki-api/app/Policies/SignaturePolicy.php), [`AttackPolicy`](shingeki-api/app/Policies/AttackPolicy.php), [`SystemResultPolicy`](shingeki-api/app/Policies/SystemResultPolicy.php) |
| Testes de feature | [`shingeki-api/tests/Feature/`](shingeki-api/tests/Feature/) — projetos, sistemas, assinaturas, ataques, resultados |
| Testes unitários | [`shingeki-api/tests/Unit/`](shingeki-api/tests/Unit/) — serviços de assinatura, ataques e modelos |

---

[Voltar ao README principal](README.md)
