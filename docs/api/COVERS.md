# API — Capas e biblioteca

Imagens de capa para projetos e sistemas. Voltar ao [índice da API](../API.md).

CRUD de entidades: [PROJECTS-AND-SYSTEMS.md](PROJECTS-AND-SYSTEMS.md).

## Armazenamento

- Disco: `public` → `storage/app/public/covers`
- Path persistido: `/storage/covers/{uuid}.{ext}`

## Seleção de capa (create / update)

Capa é **opcional** no create. Projeto ou sistema pode ser criado só com `name` / `description` (e URLs no sistema); `cover_path` fica `null`.

Envie **apenas um** dos campos de capa por requisição (quando quiser definir capa):

| Campo | Create | Update |
|-------|--------|--------|
| `cover` | arquivo imagem (PNG, JPG, WebP), máx. 5 MB | opcional |
| `cover_upload_id` | UUID existente na biblioteca do usuário | opcional |

Regras: `prohibits` impede enviar `cover` e `cover_upload_id` juntos. Upload de capa apenas no **client web**.

Banco de imagens (Pexels) é só no BFF: `GET /api/cover-stock-images` e `POST /api/cover-stock-images/download` (`PEXELS_API_KEY` em `apps/client/.env.local`). A Laravel só recebe o arquivo já baixado, como qualquer `cover`.

Ao enviar arquivo novo (capa de projeto/sistema **ou** foto de perfil), a API registra entrada na biblioteca (`user_cover_uploads`) via `UserCoverLibraryService::registerUpload` — unico ponto de entrada para midia do usuario.

## Biblioteca por usuário

Limite configurável em `COVER_MAX_UPLOADS_PER_USER` (padrão **20**). Ver `config/covers.php`.

### GET /api/cover-uploads

**Resposta `200`:**

```json
{
  "limit": 20,
  "count": 3,
  "cover_uploads": [
    {
      "id": "uuid",
      "path": "/storage/covers/abc.jpg",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### DELETE /api/cover-uploads/{coverUpload}

Remove a entrada da biblioteca do usuario. Se a imagem **nao** estiver referenciada em projeto, sistema ou avatar do usuario, o arquivo tambem e apagado do disco.

Se a imagem **estiver em uso**, apenas a entrada da biblioteca e removida — o projeto, sistema ou avatar continua exibindo a imagem ate voce trocar ou excluir a referencia.

**Resposta `200`:**

```json
{
  "message": "Cover upload removed successfully."
}
```

O `{coverUpload}` deve pertencer ao usuario autenticado (route binding); caso contrario `404`.

## Comportamento ao editar

Trocar a capa no `PUT` **não** remove a entrada antiga da biblioteca automaticamente — o histórico acumula até remoção manual ou purge ao excluir projeto/sistema.

## Excluir projeto

`DELETE /api/projects/{project}` remove capas órfãs do projeto e dos sistemas filhos quando o path não é mais referenciado.

## Legado

Registros criados antes da biblioteca podem ter `cover_path` sem linha em `user_cover_uploads`. A imagem continua acessível pela URL; só não aparece na biblioteca até um novo upload.
