# Deploy para testes

Sobe o client, a API (HTTP + consumers de fila), MySQL, RabbitMQ e os workers DAST e SAST.

Arquivos: [`docker-compose.prod.yml`](../docker-compose.prod.yml), [`deploy/Caddyfile`](../deploy/Caddyfile), [`.env.production.example`](../.env.production.example).

O browser só fala com o Caddy. `/storage` vai para a API (capas); o resto vai para o Next.js, que chama a API pela rede interna.

## O que escolher

A stack precisa de Docker e de memória de verdade por causa do Chromium do DAST. Um container grátis que dorme não aguenta.

O caminho previsto é **a sua máquina**, ligada o tempo todo. O IP de casa pode mudar (e, em muita conexão residencial, nem chega a ser acessível de fora). Quem testa usa um nome fixo. A máquina abre um túnel de saída; ninguém configura redirecionamento de porta.

| Caminho | Custo | Nome que as pessoas usam |
|---------|--------|---------------------------|
| Sua máquina + túnel nomeado da Cloudflare | Domínio (cerca de R$ 40/ano se você ainda não tiver um) + conta Cloudflare grátis | `https://shingeki.seudominio.com` |
| Sua máquina + Tailscale Funnel | R$ 0, plano Personal | `https://sua-maquina.tailnet.ts.net` |
| VPS de 8 GB (Hetzner CX32 ou equivalente) | cerca de €7/mês | IP público ou domínio, com as portas 80 e 443 abertas |

O túnel rápido `trycloudflare.com` muda de endereço quando reinicia. Não use esse.

## Antes de mandar o link

As senhas do seed estão no guia de desenvolvimento ([credenciais](RUN-PROJECT.md#credenciais-do-seed)): `test@example.com` / `password` e `admin@admin.com` / `password`. Troque as duas no primeiro login, antes de passar a URL. O seed não sobrescreve senha de usuário que já existe.

Quem tem conta pode disparar DAST contra uma URL. Convide só gente de confiança.

## 1. Preparar a máquina

Instale o Docker Engine e entre no grupo `docker`. No Fedora:

```bash
sudo dnf install -y docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Abra um terminal novo depois do `usermod`.

A máquina precisa ficar acordada. Suspensão derruba o acesso até alguém abrir a tampa ou mexer no teclado. Num desktop ou notebook sempre na tomada:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/no-sleep.conf >/dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
EOF
sudo systemctl restart systemd-logind
```

O Docker sobe com o sistema, e os containers deste compose têm `restart: unless-stopped`. Quando a operadora trocar o IP, o túnel reconecta sozinho. O nome público continua o mesmo.

Se a RAM apertar no build, crie swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Subir a stack

No clone do repositório:

```bash
cp .env.production.example .env.production
```

Gere a chave da API e cole em `APP_KEY`:

```bash
echo "base64:$(openssl rand -base64 32)"
```

Troque `DB_PASSWORD` e `RABBITMQ_PASSWORD`.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile share up -d --build
```

Se o build morrer por memória, repita com um serviço por vez (`--build` no `client`, depois `api`, `sast-worker`, `dast-worker`).

Acompanhe a API até o migrate terminar:

```bash
docker logs -f shingeki-prod-api
```

Na própria máquina, `http://127.0.0.1` responde. O login que você manda para outras pessoas exige o HTTPS do túnel: o cookie de sessão é `Secure`.

## 3. Nome fixo, IP de casa variável

Não abra porta no roteador. Não mande o IP da operadora.

### Cloudflare (nome que você escolhe)

1. Crie uma conta grátis na Cloudflare e adicione um domínio que já seja seu (plano Free). No registrador, troque os nameservers pelos dois que a Cloudflare mostrar.
2. Em [Cloudflare One](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels** → **Create a tunnel**. Dê um nome, escolha Docker e copie o token.
3. No túnel, publique um hostname, por exemplo `shingeki.seudominio.com`. O serviço é **HTTP** e a URL é `http://caddy:80`. É o nome do container na rede do compose. `localhost` aqui aponta para o container do túnel e a página não abre.
4. Em `.env.production`:

```bash
PUBLIC_URL=https://shingeki.seudominio.com
CLOUDFLARE_TUNNEL_TOKEN=cole-o-token
COOKIE_SECURE=true
SITE_ADDRESS=:80
```

5. Suba de novo para a API passar a usar esse endereço:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile share up -d
```

O endereço não muda quando o IP da casa muda, nem quando o container reinicia. Confira com `docker logs shingeki-prod-cloudflared`: a linha de conexão registrada basta.

### Sem comprar domínio

[Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel) no plano Personal. O nome `https://sua-maquina.sua-tailnet.ts.net` também fica estável e não depende do IP.

Na conta, ligue MagicDNS, HTTPS certificates e Funnel. Com o Caddy já em `127.0.0.1:80`:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel 80
```

Mande a URL `https://….ts.net` que o comando imprimir. Deixe o Funnel ligado (`tailscale funnel status`). Não precisa do perfil `share` nesse modo.

Login Google, se for usar, pede URL estável: `GOOGLE_REDIRECT_URI` igual a `{PUBLIC_URL}/oauth/google/callback`, cadastrada no Google Cloud. O Caddy manda `/oauth/google/*` para a API. Detalhe do fluxo: [AUTHENTICATION.md](api/AUTHENTICATION.md).

### VPS, se a máquina de casa não puder ficar ligada

Publique o Caddy na internet em vez do túnel. Em `.env.production`, `HTTP_BIND=80` e `HTTPS_BIND=443`. Aponte um domínio (ou `1.2.3.4.nip.io`, com o IP da VPS) assim:

```bash
SITE_ADDRESS=seudominio.com
PUBLIC_URL=https://seudominio.com
```

Suba sem o perfil `share`. As portas 80 e 443 precisam chegar na VPS para o Caddy pedir o certificado.

## 4. Operação

| Ação | Comando |
|------|---------|
| Logs da API e dos consumers | `docker logs -f shingeki-prod-api` |
| Logs do DAST | `docker logs -f shingeki-prod-dast-worker-1` (e `-2`) |
| Atualizar depois de um `git pull` | `docker compose --env-file .env.production -f docker-compose.prod.yml --profile share up -d --build` |
| Parar | `docker compose --env-file .env.production -f docker-compose.prod.yml --profile share down` |

MySQL e os arquivos de capa ficam nos volumes `shingeki-prod_mysql_data` e `shingeki-prod_api_storage`. `down` sem `-v` preserva os dois.

Os projetos de lab que o seed cria apontam para `127.0.0.1`. Eles não existem nesta stack. Para um teste real, cadastre um sistema com a URL pública do alvo.
