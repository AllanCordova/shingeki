# Shingeki

Detecta vulnerabilidades em sistemas web autorizados e devolve a correção em código, pronta para copiar.

Um projeto reúne vários sistemas. Cada sistema é um alvo. O catálogo de ataques é o mesmo para todos; a remediação muda conforme a stack daquele sistema.

## Rodar

```bash
docker compose up -d
npm install
npm run dev
```

O seed cria o projeto **Laboratório** com quatro alvos públicos de scanner: OWASP Juice Shop, Google Firing Range, Acunetix ASP.NET e Gin and Juice. Credenciais e o restante da stack: [docs/RUN-PROJECT.md](docs/RUN-PROJECT.md).

## Documentação

A fonte canônica é [`docs/`](docs/index.md). O fluxo do operador e o desenho do monorepo estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Site publicado: [allancordova.github.io/shingeki](https://allancordova.github.io/shingeki/).

## Licença

[MIT](LICENSE).
