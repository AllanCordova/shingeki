# Desenvolvimento — Mobile (Expo / Android)

Guia para levantar o app `shingeki-mobile` no emulador ou dispositivo Android.

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

Contratos HTTP: [API.md](API.md).
