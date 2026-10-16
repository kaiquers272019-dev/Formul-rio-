# Rocha Academy — qualificação de leads

Formulário público em passos (`/aplicacao`) que leva cada lead por um caminho decidido pelas respostas, e painel admin (`/admin`) com lista de leads, editor visual de fluxo (grafo), rascunho/publicar e analytics de funil.

Stack: Next.js 16 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · Prisma 7 + `@prisma/adapter-pg` · Postgres · `jose` · `@xyflow/react` 12.

## Rodar localmente

```bash
cp .env.example .env          # preencha DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm install                   # roda `prisma generate` no postinstall
npx prisma migrate deploy     # aplica prisma/migrations no banco
npm run dev                   # http://localhost:3000
```

- Formulário: `http://localhost:3000/aplicacao?origin=instagram` (ou `/?origin=...`, que redireciona preservando a query).
- Admin: `http://localhost:3000/admin` (senha = `ADMIN_PASSWORD`).
- Se existir `.env.local`, ele ganha de `.env`. Confira a linha `Environments:` no log do `next dev`.

Verificações:

```bash
npm test            # motor de fluxo + migração do formato antigo
npx tsc --noEmit
npx eslint .
npm run build
```

## Estrutura

| Caminho | O que é |
| --- | --- |
| `lib/flow.ts` | Lógica pura e tipos do fluxo (`resolveNextNode`, validação, fluxo padrão, conversão do formato antigo). Sem Prisma: é importado por componentes client. |
| `lib/flow-db.ts` | Somente servidor: `getPublishedGraph`, `getDraftGraph`, `saveDraftGraph`, `publishDraftGraph` e a migração lazy. |
| `lib/analytics.ts` | Agregação do funil sobre `Lead.visited`. |
| `lib/auth.ts`, `proxy.ts` | JWT HS256 em cookie `rocha_admin_session` (30 dias) e proteção de `/admin` e `/api/admin`. |
| `app/aplicacao` | Formulário público (`Wizard`). |
| `app/api/leads` | Avanço do lead; a próxima etapa é calculada no servidor a partir do grafo publicado. |
| `app/admin` | Dashboard de leads. |
| `app/admin/fluxo` | Editor visual, pré-visualização e barra de analytics. |

### Regra de roteamento

Ao sair de uma etapa, vale a **primeira** seta (na ordem) cujas tags exigidas estão todas nas tags acumuladas do lead. Se nenhuma bater, vale a **última** seta. A ordem das setas de uma etapa pode ser trocada no painel da conexão (Prioridade ↑/↓).

## Deploy (GitHub + Vercel + Neon)

1. Crie um repositório **privado** vazio no GitHub e faça push deste projeto.
2. `vercel link` (conecta ao repositório) e `vercel install neon` (cria o Postgres e injeta `DATABASE_URL` e `DATABASE_URL_UNPOOLED`).
3. `vercel env add ADMIN_PASSWORD` e `vercel env add SESSION_SECRET` em production, preview e development. Use valores aleatórios fortes (`openssl rand -base64 24` / `openssl rand -hex 32`).
4. Migrations contra o banco real usando a URL **sem pooler**:
   ```bash
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma migrate deploy
   ```
5. `vercel deploy --prod`.
6. Em produção: percorra o formulário no celular, entre no admin, edite, salve e publique o fluxo, e apague os leads de teste.
