# Estrutura de pastas

Raiz: `workers/dast`. Módulo Go `github.com/shingeki/dast-worker`, Go 1.25.

```text
workers/dast
├── cmd
│   ├── worker/main.go          processo que consome a fila
│   └── harness/main.go         gabarito local, sem RabbitMQ
├── internal
│   ├── config                  env → structs
│   ├── contracts               JSON de entrada e saída, auth, escopo
│   ├── queue                   conexão, filas, consumer, cancel, publisher
│   ├── orchestrator            um disparo do começo ao completion
│   ├── discovery               crawl e vetores
│   │   ├── bfs                 fila de prioridade, score e blocklist
│   │   ├── static              Colly e leitura de HTML
│   │   └── dynamic             Rod/Chromium, rede, forms, sessão
│   ├── attack                  pool Resty e mapeamento vetor → job
│   │   ├── injectors           monta a requisição baseline e a com payload
│   │   └── types               Job, PayloadSpec, Response
│   ├── evidence                validadores; o primeiro que confirma ganha
│   ├── secrets                 varredura passiva de tokens
│   └── goldset                 alvos e expectativas do harness
├── pkg
│   ├── httputil                dump, redirect same-origin, reachability
│   └── targeturl               normalização e fragmento de SPA
├── deployments/Dockerfile
├── docs                        esta documentação
├── .env.example
├── go.mod
└── README.md
```

Não há `routes/` nem servidor HTTP. A “rota” do worker é o nome da fila e o campo `event` da mensagem. Rotas do alvo são dados: `route_map` no lote, URLs descobertas e `AttackVector.Route`.

## Quem chama quem

| Pacote | Entrada | Saída |
|--------|---------|--------|
| `cmd/worker` | sinais do SO, env | sobe publisher, cancel consumer e dispatch consumer |
| `queue` | corpo AMQP | `DispatchBatch` para o handler; JSON de volta na fila de resultados |
| `orchestrator` | `DispatchBatch` | probes, achados, completion |
| `discovery` | URL, auth, opções do lote | `[]AttackVector` |
| `secrets` | URL, vetores, auth | hits passivos, só se o lote tem categoria `SECRET_LEAK` |
| `attack` | vetores + catálogo do lote | `[]Response` (baseline e ataque) |
| `evidence` | uma `Response` | `*Finding` ou nil |
| `goldset` | origem do `httptest` | relatório HIT / MISS / EXTRA |

`internal` não é importável por outros módulos. `pkg` é código compartilhado dentro deste módulo (o worker não publica biblioteca).

## Binários

| Comando | Build | Função |
|---------|--------|--------|
| `go build -o worker ./cmd/worker` | imagem em `deployments/Dockerfile` | loop de produção |
| `go run ./cmd/harness -fixture secrets\|access\|inject` | local | três gabaritos; exit 1 se faltar desafio esperado |

O Dockerfile final é Debian com Chromium. O binário é estático (`CGO_ENABLED=0`). `CHROME_PATH=/usr/bin/chromium` e Rod headless sem sandbox vêm do ambiente da imagem, não do default de `config.Load`.
