# Shingeki Mobile

## Sobre o app

Aplicação mobile focada no gerenciamento e simulação de testes de segurança em sistemas. Com funcionalidades de autenticação e ataques simulados. O aplicativo permite que o usuário gerencie tudo em projetos, adicione os sistemas alvos juntamente com sua stack; após a validação de posse do sistema, o mesmo faz simulações de ataques que geram logs básicos de auditoria.

### Funcionalidades Básicas (Prioritárias)

_Acompanhamento do desenvolvimento a cada Checkpoint:_

- [x] **Autenticação de Usuário:** Login e cadastro seguro para acesso à plataforma.
- [x] **CRUD de Projetos:** Gerenciamento dos projetos que englobam os sistemas.
- [x] **CRUD de Sistemas:** Cadastro e manutenção dos sistemas alvo.
- [x] **Stacks em Sistemas:** Associação de tecnologias ao criar ou editar um sistema (`stack_ids` via catálogo `GET /stacks`).
- [ ] **CRUD de Stacks (catálogo):** Criação, leitura, atualização e exclusão das tecnologias no catálogo global.
  - _Justificativa:_ A API expõe apenas `GET /stacks` (listagem). O mobile permite **selecionar** stacks nos sistemas; a gestão do catálogo (admin) permanece no `shingeki-client`.
- [x] **Validação de Posse:** Mecanismo para confirmar se o sistema alvo realmente pertence ao usuário logado antes de qualquer interação crítica.
- [x] **Simulação de Ataque:** Funcionalidade para disparar um ataque contra o sistema validado.
- [x] **Geração de Logs Básicos:** Registro simples em log dos ataques realizados nos sistemas.

---

## Protótipos de tela

O design do aplicativo segue padrões de Design System e boa usabilidade para os usuários.

**Link para visualização:**
[Protótipo Figma](https://www.figma.com/design/uWGP5doMAqxDebsv9FYJOO/shingeki?node-id=1-3&t=galdGjExd2ltI9uO-1)

**Mapa de Telas (Visual):**

| Rota | Tela |
|------|------|
| `/login` | Login |
| `/registro` | Cadastro |
| `/projetos` | Listagem de projetos |
| `/projetos/[projectId]` | Detalhe do projeto e sistemas |
| `/projetos/[projectId]/sistemas/[systemId]` | Detalhe do sistema (assinatura, ataque, histórico) |
| `/projetos/[projectId]/sistemas/[systemId]/resultados/[dispatchId]` | Resultados do disparo |
| `/perfil` | Perfil do usuário |

---

## Modelagem do banco

O aplicativo atua como um cliente que consome uma **API externa**, logo a persistência de dados do Shingeki Mobile não ocorre localmente.

O diagrama abaixo representa a modelagem do banco de dados relacional.

**Diagrama**
[Visualizar Diagrama Entidade-Relacionamento](https://drawsql.app/teams/utfpr-14/diagrams/shingeki)

**Diagrama (Imagem):**
![Diagrama ER](.github/images/schema.jpg)

---

## Planejamento de sprints

**Sprint 1: Base e Autenticação (Duração: 1 Semana)**

- [x] Configuração inicial do projeto mobile e roteamento (Expo Router, layouts `(auth)` e `(app)`).
- [x] Integração de consumo da API Laravel (cliente HTTP com Axios e interceptors).
- [x] Implementação da interface e lógica de Autenticação (Login/Cadastro/Logout).
- [x] Armazenamento local do token de sessão (`expo-secure-store`).
- [ ] Criação de testes unitários e integração para todas as funções acima.
  - _Justificativa:_ Priorizamos a entrega do fluxo funcional ponta a ponta e a validação manual no emulador/dispositivo. Os contratos HTTP são cobertos por testes de feature na API (`shingeki-api`); testes automatizados no mobile ficam como melhoria futura.

**Sprint 2: Cadastros Base — Projetos e Sistemas (Duração: 1 Semana)**

- [x] Desenvolvimento das telas de listagem, criação e edição de Projetos.
- [x] Integração do CRUD de Projetos com a API.
- [x] Desenvolvimento das telas de listagem, criação e edição de Sistemas.
- [x] Integração do CRUD de Sistemas com a API.
- [ ] Criação de testes unitários e integração para todas as funções acima.
  - _Justificativa:_ Mesmo critério da Sprint 1; formulários validados com Zod + React Hook Form e erros de campo mapeados da API.

**Sprint 3: Estrutura das Stack — Stacks (Duração: 1 Semana)**

- [x] Seleção de stacks tecnológicas no formulário de criação e edição de sistemas (`StackSelect` + `GET /stacks`).
- [x] Integração de `stack_ids` com a API nos endpoints de sistemas.
- [x] Exibição das stacks associadas no card e na tela de detalhe do sistema.
- [ ] Desenvolvimento das telas de listagem, criação e edição do **catálogo** de Stacks.
- [ ] Criação de testes unitários e integração para todas as funções acima.
  - _Justificativa:_ O escopo mobile cobre a associação de stacks aos sistemas. O CRUD do catálogo global não possui endpoints de escrita na API.

**Sprint 4: Funcionalidades principais — Validação e Ataque (Duração: 2 Semanas)**

- [x] Implementação da interface da página de detalhes do Sistema.
- [x] Desenvolvimento da funcionalidade de “Validação de Posse” (gerar token, instalar meta tag, validar e revogar via API).
- [x] Desenvolvimento da função de “Atacar Sistema” (`POST .../attacks/dispatch`).
- [x] Captação da resposta da API e exibição dos logs básicos gerados pelo ataque (lista de disparos e tela de resultados com evidências).
- [ ] Criação de testes unitários e integração para todas as funções acima.
  - _Justificativa:_ Mesmo critério das sprints anteriores.

**Sprint 5: Refinamento e Entrega Final (Duração: 0,5 Semanas)**

- [x] Polimento de UI/UX (tratamento de erros, loading states, feedbacks visuais com toasts).
- [x] Atualização final da documentação e preparação para a apresentação.

**Tarefas adicionais (não previstas no planejamento inicial)**

- [x] Tela de **Perfil** com edição do nome do usuário (`PUT /auth/me`).
- [x] **Header** global com navegação, link para perfil e logout.
- [x] **Polling automático** de disparos e resultados enquanto o status estiver `pending`.
- [x] **Cópia da meta tag** de assinatura para a área de transferência (`expo-clipboard`).
- [x] **Design system** com NativeWind/Tailwind e biblioteca de componentes UI reutilizáveis (`Button`, `Card`, `Modal`, `Field`, etc.).
- [x] **Seleção de stacks** nos formulários de sistema (`StackSelect`, `use-stacks`).
- [x] Hooks de dados com **TanStack React Query** (substituindo o uso de Zustand para estado de servidor; Zustand permanece apenas para estado de UI local).

---

## Atualizações desde o último checkpoint

- Fluxo de autenticação completo (login, registro, logout, sessão persistida).
- Telas de Login e Registro com validação de formulário.
- Navegação em stack com Expo Router e layouts `(auth)` / `(app)`.
- CRUD de Projetos (listagem, criação, edição e exclusão).
- CRUD de Sistemas (listagem por projeto, criação, edição e exclusão).
- **Stacks tecnológicas** nos sistemas (seleção no formulário, exibição no card e detalhe).
- Validação de posse via painel de assinatura (gerar, validar, revogar).
- Disparo de ataques contra sistema validado.
- Histórico de disparos e visualização detalhada dos resultados (logs de auditoria).
- Tela de Perfil com atualização de nome.
- Estados de carregamento, erro e feedback visual (toasts) em todas as operações críticas.

### Desenvolvimento

- Separação em componentes reutilizáveis (`components/ui`, `components/forms`, `components/projects`, etc.).
- Hooks com **TanStack React Query** para autenticação, projetos, sistemas, **stacks**, assinaturas, ataques e resultados — cache, invalidação e refetch automático.
- **Zustand** apenas para estado de UI local (`lib/stores/ui-store.ts`).
- Variáveis de estilo centralizadas em `lib/css-vars.ts` com tokens NativeWind para UI consistente.
- Navegação com **Expo Router** (`Stack`), ocultando header nativo e usando `Header` customizado na área autenticada.
- Formulários com **React Hook Form** + **Zod**, alinhados aos contratos da API.
- Token Sanctum armazenado em **expo-secure-store**; cliente HTTP em `lib/api/client.ts`.

### Como rodar

Ver [docs/MOBILE-DEVELOPMENT.md](docs/MOBILE-DEVELOPMENT.md) e [shingeki-mobile/README.md](shingeki-mobile/README.md).
