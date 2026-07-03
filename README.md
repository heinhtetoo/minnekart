# Minnekart

Your journeys, mapped. A personal travel memory site: an interactive
globe where every pin is a place you've stood, opening into the story,
dates, and photographs of that visit.

See [PRD.md](./PRD.md) for the full product requirements and
[progress.md](./progress.md) for the implementation plan and status.

## Stack

Next.js (App Router) + TypeScript on Vercel, Neon Postgres via Drizzle,
Cloudflare R2 for photos, hand-rolled auth (invite-only). Details and
rationale in the PRD.

## Development

```sh
cp .env.example .env   # adjust if needed
docker compose up -d   # local Postgres on port 5433
npm install
npm run dev
```

## Checks

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
```
