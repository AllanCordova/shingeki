# Extensão (`apps/extension`)

Extensão **Chrome / Edge (Manifest V3)** que captura cookies HttpOnly do domínio do alvo e completa o ticket público `POST /api/target-session/capture/{ticket}`.

Contrato HTTP e fluxos (popup, extensão, import): [docs/api/TARGET-SESSION.md](../../docs/api/TARGET-SESSION.md). Este README é a fonte única de **instalação, ZIP e `manifest.json`**.

Não usa o token Sanctum do usuário — só o ticket de curta duração armado pelo Shingeki web.

## Por que

SaaS (ex.: Bling) nao hospeda `/shingeki-capture.php` e cookies de sessao sao HttpOnly. A pagina web do Shingeki nao consegue le-los; a extensao sim (`chrome.cookies`).

## Instalacao para o usuario

### Piloto / demo (agora)

1. No painel **Sessao do alvo** do Shingeki, baixe `shingeki-target-session.zip`
   (`/extensions/shingeki-target-session.zip`).
2. Extraia a pasta.
3. Abra `chrome://extensions` → Mode do desenvolvedor → **Carregar sem compactacao** → pasta extraida.
4. Recarregue o Shingeki (localhost:3000).

Para regenerar o ZIP servido pelo client:

```powershell
pwsh ./apps/extension/pack.ps1
```

### Producao (clientes finais)

O caminho correto e a **Chrome Web Store** (e Edge Add-ons):

1. Conta developer Google (taxa unica).
2. Enviar a extensao para revisao.
3. No painel, trocar o link do ZIP pelo link da Store.
4. Fixar ID da extensao + `NEXT_PUBLIC_SHINGEKI_EXTENSION_ID` quando for o caso.

Clientes finais **nao** precisam (nem devem) ter a pasta do monorepo.

Devs ainda podem carregar a pasta `apps/extension` direto do repo.

Opcional:

```env
NEXT_PUBLIC_SHINGEKI_EXTENSION_ID=<id-da-extensao>
```

O fluxo padrao em localhost usa **content script** (nao precisa do ID).

Para outro host do client, edite `content_scripts.matches` e `externally_connectable.matches` no [`manifest.json`](manifest.json).

## Fluxo

1. Shingeki: **Conectar ao alvo**.
2. A extensao abre o login em **aba normal** (nao popup) — o icone fica na barra.
3. Faca login nessa aba.
4. Clique no icone Shingeki (pode estar em qualquer aba) → **Capturar sessao**.
5. A extensao procura a aba do `target_origin`, envia cookies e o Shingeki fica **Conectada**.

## Checklist manual

### Lab

- [ ] Sem extensao: popup lab + `/shingeki-capture.php` ainda funciona.
- [ ] Com extensao + `http://127.0.0.1:8090`: Conectar → login → Capturar → Conectada.

### SaaS (Bling)

- [ ] Conectar abre aba normal (icone visivel).
- [ ] Capturar funciona mesmo com o popup da extensao aberto (nao exige aba do Shingeki ativa).
- [ ] Re-clicar Capturar apos sucesso nao assusta: mensagem de “ja enviada” se o ticket ja foi consumido.

### Fallbacks

- [ ] Sem extensao: download ZIP + import manual.
- [ ] Ticket expirado (15 min): Conectar de novo.

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `manifest.json` | MV3, `cookies`, `host_permissions: <all_urls>` |
| `background.js` | Armar ticket, abrir aba, ler cookies, POST capture |
| `popup.html` / `popup.js` | UI Capturar |
| `content-bridge.js` | Ponte `postMessage` com o client |
| `pack.ps1` | Gera o ZIP em `apps/client/public/extensions/` |

`<all_urls>` e necessario para ler cookies de qualquer SaaS autorizado pelo usuario.
