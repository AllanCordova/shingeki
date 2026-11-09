# Shingeki

Detecta vulnerabilidades em sistemas web autorizados e devolve a correção em código, pronta para copiar.

Um projeto reúne vários sistemas. Cada sistema é um alvo. O catálogo de ataques é o mesmo para todos; a remediação muda conforme a stack daquele sistema.

Este arquivo descreve o que a banca precisa para acessar, executar e avaliar o trabalho. O mesmo conteúdo deve ser colado no campo **Instruções adicionais** do SGTCC.

## Repositório

https://github.com/AllanCordova/shingeki

## Vídeo de demonstração

https://youtu.be/k51GRkimX8U

## Acesso ao sistema

https://shingeki.com.br/

O login fica em https://shingeki.com.br/login. As credenciais estão na seção [Autenticação](#autenticação-e-credenciais-de-teste).

Quem for executar o código na própria máquina, depois da instalação abaixo, usa estes endereços:

| Serviço | URL |
|---------|-----|
| Interface web | http://localhost:3000 |
| API | http://127.0.0.1:8000/api |
| RabbitMQ Management | http://localhost:15672 (`guest` / `guest`) |
| Captura de sessão (noVNC) | http://127.0.0.1:6080 |

## Documentação do sistema

https://allancordova.github.io/shingeki/

## Instalação

Requisitos:

- PHP 8.4+ e Composer 2.x
- Node.js 20+ e npm
- Docker e Docker Compose
- Memória suficiente para o Chromium do worker DAST

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/AllanCordova/shingeki.git
cd shingeki
```

Na raiz:

```bash
npm run dev
```

O comando cria os `.env` que ainda não existem, instala dependências, sobe MySQL, RabbitMQ, consumers e os workers, e inicia a API e o client. Arquivos `.env` já existentes não são sobrescritos.

O primeiro `npm run dev` migra o banco e não popula catálogo, usuários nem o projeto de demonstração. Em outro terminal, na mesma raiz:

```bash
npm run seed
```

## Execução

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/AllanCordova/shingeki.git
cd shingeki
```

Siga a [instalação](#instalação). Com a stack no ar:

- interface em http://localhost:3000
- API em http://127.0.0.1:8000/api

Para parar os containers:

```bash
npm run down
```

Depois de alterar código dos workers:

```bash
npm run dev:build
```

Guia completo, filas e validação dos workers: [docs/RUN-PROJECT.md](docs/RUN-PROJECT.md).

## Utilização

1. Abra https://shingeki.com.br/login e entre com `test@example.com` / `password`. Na stack local, o mesmo fluxo está em http://localhost:3000/login. Quem roda o código na própria máquina também entra com o administrador `admin@admin.com` / `password`.
2. Abra o projeto **Laboratório**. O seed cria quatro alvos públicos feitos para scanner: OWASP Juice Shop, Google Firing Range, Acunetix ASP.NET e Gin and Juice.
3. Abra um sistema, dispare um ataque e aceite os termos de responsabilidade. O disparo só segue com esse aceite.
4. Aguarde o resultado. O worker publica achados; a interface mostra evidências e o snippet de correção da stack daquele sistema.

Ataque os alvos do Laboratório, ou um sistema para o qual exista autorização. O procedimento de disparo e de leitura dos resultados está em [docs/api/ATTACKS-AND-RESULTS.md](docs/api/ATTACKS-AND-RESULTS.md).

## Autenticação e credenciais de teste

Na interface, use **Entrar** com e-mail e senha. A API autentica em `POST /api/auth/login` e devolve um token Sanctum. No client, esse token fica em cookie http-only; a banca não precisa montar o header à mão para usar a interface.

A banca entra no sistema publicado só com `test@example.com` / `password`, em https://shingeki.com.br/login. É um dado fictício. Se o usuário já existir, o seed não troca a senha; no sistema publicado a senha desta conta é `password`.

Quem roda a stack local, depois de `npm run seed`, entra em http://localhost:3000/login com essa conta e também com o perfil de administrador.

| E-mail | Senha | Perfil | Uso |
|--------|-------|--------|-----|
| `test@example.com` | `password` | `SPECIALIST` | Projeto Laboratório, catálogo global e arsenal manual. Vale no sistema publicado e na stack local |
| `admin@admin.com` | `password` | `ADMIN` | Perfil de administrador. Só na stack local, depois de `npm run seed` |

Papéis e contrato HTTP: [docs/api/AUTHENTICATION.md](docs/api/AUTHENTICATION.md).

Login com Google, remediação por IA e abertura de pull request no GitHub dependem de chaves que não entram nesta entrega. Sem essas chaves, o login por e-mail e a correção literal do catálogo continuam disponíveis.

## Restrições de acesso

O código-fonte é público em https://github.com/AllanCordova/shingeki. O zip entrega a mesma base, sem omissão por confidencialidade, propriedade intelectual ou contrato.

Ficam de fora do zip apenas segredos locais (`.env`, `.env.prod`, `.env.production`), dependências instaladas e chaves de terceiros. Isso é higiene da entrega, não restrição de avaliação: a banca executa o trabalho com os exemplos versionados e com as credenciais desta página.

## Licença

[MIT](LICENSE).
