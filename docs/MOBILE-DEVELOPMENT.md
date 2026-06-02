# Desenvolvimento — Mobile (Expo / Android)

Guia para levantar o app `shingeki-mobile` no emulador ou dispositivo Android.

**Pré-requisito:** API em execução — [RUN-PROJECT.md](RUN-PROJECT.md) (seções 1–3).

No emulador ou celular físico, a API precisa estar acessível pela rede do dispositivo. Ao seguir o [RUN-PROJECT.md](RUN-PROJECT.md#api-em-execucao), use `php artisan serve --host=0.0.0.0 --port=8000` se for testar em aparelho físico na mesma Wi‑Fi.

## Requisitos

- Itens de [RUN-PROJECT.md](RUN-PROJECT.md#requisitos)
- **Android Studio** com emulador configurado, ou dispositivo físico na mesma rede
- **Expo CLI** via `npx expo` (incluído nas dependências do projeto)

## 1. Configuração do mobile

Copie o ambiente do mobile:

```bash
cp shingeki-mobile/.env.example shingeki-mobile/.env
```

Instale dependências:

```bash
cd shingeki-mobile
npm install
cd ..
```

### Variáveis do mobile

Em `shingeki-mobile/.env`:

| Cenário | `EXPO_PUBLIC_API_BASE_URL` | `EXPO_PUBLIC_MEDIA_BASE_URL` |
|---------|---------------------------|------------------------------|
| Emulador Android | `http://10.0.2.2:8000/api` | `http://10.0.2.2:8000` (sem `/api`) |
| Dispositivo físico | `http://{IP-da-sua-máquina}:8000/api` | `http://{IP-da-sua-máquina}:8000` (sem `/api`) |

`EXPO_PUBLIC_MEDIA_BASE_URL` monta URLs de capa: `{MEDIA}/storage/covers/...`. Se terminar em `/api`, as imagens não carregam no app.

O emulador Android não alcança `127.0.0.1` do host — use `10.0.2.2` para apontar para a máquina onde a API está rodando.

O app chama a API Laravel **diretamente** (sem BFF). O token Sanctum fica em `expo-secure-store`.

## 2. Subir o app no Android

Com a API rodando e o `.env` do mobile ajustado:

```bash
cd shingeki-mobile
npx expo start
```

No terminal do Expo:

- Pressione **`a`** para abrir no emulador Android, ou
- Escaneie o QR code com **Expo Go** no dispositivo físico (mesma rede Wi‑Fi que o PC).

Faça login com as credenciais do seed ([RUN-PROJECT.md](RUN-PROJECT.md#credenciais-do-seed)).

## 3. Solução de problemas

| Sintoma | Verificação |
|---------|-------------|
| Network request failed | `.env` com `10.0.2.2` no emulador; API com `serve --host=0.0.0.0` no físico |
| 401 após login | URL da API termina em `/api`; relogue após mudar `.env` |
| Imagens de capa não carregam | `EXPO_PUBLIC_MEDIA_BASE_URL` sem sufixo `/api` |

Contratos HTTP: [API.md](API.md).
