# Strand (swe-knowledge-base)

A personal store for work notes aimed at software engineers. You write down what you did on a project, and Strand extracts technologies, metrics, decisions, and themes so you can find the right examples later for behavioral interviews, resumes, and performance reviews.

## Features

- Capture free-text notes ("memories"), optionally tied to a project, with a date.
- Each note is analyzed into structured extractions (project, decision, outcome, metric, technology, skill, lesson, and others), each marked as explicit or inferred, plus follow-up reflection questions and behavioral themes such as Ownership or Learning from failure.
- Recall: search across your notes using keyword and embedding similarity. Related notes are linked automatically.
- Use modes that pull matching notes for a specific purpose: behavioral interview, resume, performance review, portfolio, job description matching, and career reflection.
- Timeline, project, and knowledge views (skills, technologies, themes) built from your notes.
- Email and password accounts with a signed session cookie.

## Tech stack

- Next.js 16 (App Router, route handlers), React 19, TypeScript, Tailwind CSS 4
- Prisma with SQLite
- `jose` for JWT sessions, `bcryptjs` for password hashes, `zod` for input validation
- Optional OpenAI API (`gpt-4o-mini` for analysis, `text-embedding-3-small` for embeddings)

## Getting started

Prerequisites: Node 20 (the version CI uses) and npm.

Environment variables (see `.env.example`):

- `DATABASE_URL`: SQLite file path
- `AUTH_SECRET`: secret used to sign session tokens (required)
- `OPENAI_API_KEY`: optional
- `DEMO_EMAIL`, `DEMO_PASSWORD`: credentials for the seeded demo user

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with the demo user from your `.env`, or create an account.

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run db:reset`. There is no test suite.

## How it works

- `src/lib/memories.ts` processes a new note: it calls `analyzeMemory` and `embedText` from `src/lib/ai.ts`, stores the extractions, skills, themes, and reflection questions, and links the note to similar notes by cosine similarity.
- `src/lib/ai.ts` uses OpenAI when `OPENAI_API_KEY` is set. Without a key it falls back to regex-based extraction (technology names, percentages, before/after numbers, theme keywords) and a 64-dimension hashed bag-of-words embedding, so the app works fully offline with lower-quality results.
- `src/app/api/` holds the JSON routes: `auth`, `memories`, `projects`, `reflections`, `search`, and `use`. `src/lib/auth.ts` handles sessions.
- `src/app/app/` contains the signed-in pages (home, timeline, recall, knowledge, projects, use). `prisma/schema.prisma` defines the data model and `prisma/seed.ts` creates the demo user and sample notes.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint`, `npm run typecheck`, and `npm run build`; CI runs these plus `prisma migrate deploy`.

## License

MIT, see [LICENSE](LICENSE).
