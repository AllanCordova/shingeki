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

Modelos com migrações e relacionamentos Eloquent (UUIDs, chaves estrangeiras). As **factories** e **seeders** estruturam o banco; no módulo [10](#10--integridade-e-integração) elas entram sobretudo nos **testes**.

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Migrações | [`shingeki-api/database/migrations/`](shingeki-api/database/migrations/) |
| Modelos | [`User`](shingeki-api/app/Models/User.php), [`Project`](shingeki-api/app/Models/Project.php), [`System`](shingeki-api/app/Models/System.php), [`Signature`](shingeki-api/app/Models/Signature.php), [`Attack`](shingeki-api/app/Models/Attack.php), [`AttackDispatch`](shingeki-api/app/Models/AttackDispatch.php), [`SystemResult`](shingeki-api/app/Models/SystemResult.php) |
| Factories e seeders | [`shingeki-api/database/factories/`](shingeki-api/database/factories/), [`shingeki-api/database/seeders/`](shingeki-api/database/seeders/) |

---

## 10 — Integridade e Integração

Validação e persistência de dados, com foco em **testes automatizados** que garantem a integridade da aplicação, uso de **factories** e **seeders**, **testes de models**, **integração** do backend com Eloquent nas rotas e **injeção de dependências**.

**Onde no projeto:**

| Conceito (disciplina) | Onde no projeto |
|-----------------------|-----------------|
| Testes automatizados (Pest / PHPUnit) | [`shingeki-api/tests/Pest.php`](shingeki-api/tests/Pest.php), [`TestCase.php`](shingeki-api/tests/TestCase.php); execução local `composer test` e no CI — [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [docs/ci/overview.md](docs/ci/overview.md) |
| Factories | [`shingeki-api/database/factories/`](shingeki-api/database/factories/) — ex.: `UserFactory`, `ProjectFactory`, `SystemFactory`, `SignatureFactory`; usadas nos testes com `Model::factory()->create()` |
| Seeders | [`shingeki-api/database/seeders/`](shingeki-api/database/seeders/) — ex.: [`VulnerableTargetSeeder`](shingeki-api/database/seeders/VulnerableTargetSeeder.php); validação em [`VulnerableTargetSeederTest`](shingeki-api/tests/Feature/VulnerableTargetSeederTest.php) |
| Testes de models | [`shingeki-api/tests/Unit/Models/`](shingeki-api/tests/Unit/Models/) — ex.: métodos e relacionamentos em [`SignatureTest`](shingeki-api/tests/Unit/Models/SignatureTest.php) (`permit`, `deny`, `revoke`), [`AttackDispatchTest`](shingeki-api/tests/Unit/Models/AttackDispatchTest.php) (`resolveRouteBinding`) |
| Integração da aplicação (Eloquent nas rotas) | Controllers que consultam e persistem models — ex.: [`ProjectController`](shingeki-api/app/Http/Controllers/ProjectController.php), [`SystemController`](shingeki-api/app/Http/Controllers/SystemController.php); rotas em [`shingeki-api/routes/api.php`](shingeki-api/routes/api.php) |
| Injeção de dependências | Serviços injetados no construtor dos controllers — ex.: `UserCoverLibraryService` em [`ProjectController`](shingeki-api/app/Http/Controllers/ProjectController.php); testes unitários de serviços em [`shingeki-api/tests/Unit/Services/`](shingeki-api/tests/Unit/Services/) |

---

## 11 — Autorização com Policies e Testes de Feature

**Policies** para autorizar ações por recurso e **testes de feature** (requisições HTTP com autenticação Sanctum, assertivas de status e JSON).

**Onde no projeto:**

| Artefato | Caminho |
|----------|---------|
| Policies | [`ProjectPolicy`](shingeki-api/app/Policies/ProjectPolicy.php), [`SystemPolicy`](shingeki-api/app/Policies/SystemPolicy.php), [`SignaturePolicy`](shingeki-api/app/Policies/SignaturePolicy.php), [`AttackPolicy`](shingeki-api/app/Policies/AttackPolicy.php), [`SystemResultPolicy`](shingeki-api/app/Policies/SystemResultPolicy.php) |
| Testes de feature | [`shingeki-api/tests/Feature/`](shingeki-api/tests/Feature/) — ex.: [`ProjectControllerTest`](shingeki-api/tests/Feature/ProjectControllerTest.php), [`SystemControllerTest`](shingeki-api/tests/Feature/SystemControllerTest.php), [`SignatureControllerTest`](shingeki-api/tests/Feature/SignatureControllerTest.php), [`AttackControllerTest`](shingeki-api/tests/Feature/AttackControllerTest.php) |

---

[Voltar ao README principal](README.md)
