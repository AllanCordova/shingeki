# Shingeki Mobile

App **Expo / React Native** do monorepo Shingeki — cliente mobile para gerenciamento de projetos, sistemas alvo, stacks tecnológicas, validação de posse, simulação de ataques e visualização de resultados de auditoria.

## Funcionalidades

- Autenticação (login, cadastro, logout, sessão em SecureStore)
- CRUD de projetos e sistemas
- **Stacks tecnológicas** nos sistemas (seleção ao criar/editar via `stack_ids`)
- Validação de posse (gerar token, meta tag, validar, revogar)
- Disparo de ataques e histórico de resultados com polling automático
- Perfil (atualização de nome)
- Design system NativeWind + componentes reutilizáveis

**Fora do escopo mobile:** CRUD do catálogo de stacks (a API expõe apenas `GET /stacks`; gestão administrativa no client web).

## Rotas (Expo Router)

| Rota | Tela |
|------|------|
| `/login` | Login |
| `/registro` | Cadastro |
| `/projetos` | Listagem de projetos |
| `/projetos/[projectId]` | Detalhe do projeto e sistemas |
| `/projetos/[projectId]/sistemas/[systemId]` | Sistema (stacks, assinatura, ataque, histórico) |
| `/projetos/[projectId]/sistemas/[systemId]/resultados/[dispatchId]` | Resultados do disparo |
| `/perfil` | Perfil |

[Protótipo Figma](https://www.figma.com/design/uWGP5doMAqxDebsv9FYJOO/shingeki?node-id=1-3)

## Requisitos

- Node.js (LTS)
- API Shingeki rodando ([docs/RUN-PROJECT.md](../docs/RUN-PROJECT.md))
- Android Studio (emulador) ou dispositivo com Expo Go

## Configuração

```bash
cp shingeki-mobile/.env.example shingeki-mobile/.env
cd shingeki-mobile
npm install
```

Ajuste `.env`:

| Cenário | `EXPO_PUBLIC_API_BASE_URL` | `EXPO_PUBLIC_MEDIA_BASE_URL` |
|---------|---------------------------|------------------------------|
| Emulador Android | `http://10.0.2.2:8000/api` | `http://10.0.2.2:8000` |
| Dispositivo físico | `http://{IP-LAN}:8000/api` | `http://{IP-LAN}:8000` |

O app chama a API Laravel **diretamente** (sem BFF). Token Sanctum em `expo-secure-store`.

Para dispositivo físico, suba a API com:

```bash
cd shingeki-api
php artisan serve --host=0.0.0.0 --port=8000
```

## Desenvolvimento

```bash
npx expo start
# Pressione `a` (Android) ou escaneie o QR no Expo Go
```

```bash
npm run typecheck
```

Guia completo: [docs/MOBILE-DEVELOPMENT.md](../docs/MOBILE-DEVELOPMENT.md)  
Arquitetura: [docs/architecture/shingeki-mobile.md](../docs/architecture/shingeki-mobile.md)  
Contratos HTTP: [docs/API.md](../docs/API.md)

## Stack

- Expo 56, Expo Router, React Native, TypeScript (strict)
- TanStack React Query (dados do servidor)
- Zustand (estado de UI local — modais)
- React Hook Form + Zod
- Axios, NativeWind / Tailwind

## Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

O perfil `preview` gera **APK** para distribuição interna. Bundle ID: `com.allancordovadev.shingeki`.

**Não commitar:** `.env`, `credentials.json`, `credentials/`, artefatos `*.aab` / APK.

## Paridade com o client web

Fluxos de negócio alinhados (projetos → sistemas → stacks → assinatura → ataque → resultados). Upload de capa e funcionalidades de catálogo/admin existem apenas no [shingeki-client](../shingeki-client/).

## Disciplina / entrega

Planejamento de sprints e checklist: [MOBILE-DISCPLINA.md](../MOBILE-DISCPLINA.md)
