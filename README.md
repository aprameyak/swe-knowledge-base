# Strand

Career memory store. Capture informal work notes and pull them back for interviews, resumes, and reviews.

Repo name on GitHub: `swe-knowledge-base`.

## Behavior

- Original text stays the source of truth
- Optional AI extracts structure; it does not invent metrics
- Explicit facts stay separate from inferred themes/skills

## Stack

Next.js, TypeScript, Prisma + SQLite, cookie sessions (jose), local heuristics + optional OpenAI (`OPENAI_API_KEY`)

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

http://localhost:3000

Seed account (local only): `demo@strand.app` / `demo1234`

Without `OPENAI_API_KEY`, extraction and search still run on local heuristics/embeddings.

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo history |
| `npx prisma studio` | Browse DB |

## License

MIT
