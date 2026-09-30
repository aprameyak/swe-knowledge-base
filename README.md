# Strand

A living career memory and professional knowledge base.

Capture informal professional experiences in seconds. Strand helps you **remember, reflect, organize, connect, and recall** your real history — for interviews, resumes, reviews, and ordinary Tuesdays.

## Philosophy

- Your original memories are the source of truth
- AI extracts and asks questions; it never invents metrics or accomplishments
- Explicit facts are labeled separately from inferred themes/skills
- Capture first, organize later

## Stack

- Next.js (App Router) + TypeScript
- Prisma + SQLite
- Cookie sessions (JWT via jose)
- Heuristic + optional OpenAI analysis (`OPENAI_API_KEY`)

## Setup

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo account

- Email: `demo@strand.app`
- Password: `demo1234`

### Optional AI

Add to `.env`:

```
OPENAI_API_KEY=sk-...
```

Without a key, Strand still extracts structure, metrics, technologies, reflection prompts, and semantic-ish search via local embeddings.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo career history |
| `npx prisma studio` | Browse the database |

## Product loop

**Capture → Understand → Reflect → Connect → Recall → Use**
