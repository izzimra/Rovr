# Tech Stack

## Overview

Rovr is a Next.js 15 (App Router) + TypeScript application. The AI intelligence layer lives entirely under `src/lib/` and `src/app/api/`. Mapbox (maps + routing) and Supabase (auth + Postgres + RLS) integrations are owned by other teammates and intentionally scaffolded around, not inside, the AI layer. Production infrastructure runs on AWS; the current implementation stays local-first until the AWS teammate lands the first deployment.

## Stack

| Area                         | Choice                                      |
| ---------------------------- | ------------------------------------------- |
| Language                     | TypeScript 5.6 (strict mode)                |
| Framework                    | Next.js 15 App Router, React 19             |
| Package manager / build tool | npm (pinned versions in `package.json`)     |
| State management             | Zustand 5                                   |
| UI primitives                | Tailwind CSS, shadcn/ui, Framer Motion      |
| Charts                       | Recharts                                    |
| Database + Auth              | Supabase Postgres, Supabase Auth, Supabase RLS |
| Maps + Routing               | Mapbox GL JS, Mapbox Directions API, Mapbox Matrix API |
| AI model                     | Gemini 2.5 Flash via `@google/generative-ai` |
| Cloud infrastructure         | AWS (Amplify, S3, CloudFront, Secrets Manager, CloudWatch, IAM) |
| Testing framework            | _to be decided_                             |
| Lint / format                | `next lint` (default)                       |

## Environment

- OS: Windows (`win32`), default shell `cmd`.
- Required env vars documented in `.env.example`.
- Server-only: `GEMINI_API_KEY`, `MAPBOX_SECRET_TOKEN`. Client-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`.
- AWS credentials (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`) are future-facing and not required for local development. In production they are resolved via AWS Secrets Manager / IAM role credentials, not plaintext env vars.

## Common Commands

```bash
# install dependencies
npm install

# run dev server
npm run dev

# typecheck only
npm run typecheck

# build for production
npm run build
```

## Ownership

- **AI + Product Intelligence (this track):** `src/lib/**`, `src/types/**`, `src/store/**`, `src/app/api/**`.
- **Maps / Infrastructure:** Mapbox GL JS rendering, Mapbox Directions API, Mapbox Matrix API, AWS deployment (Amplify, S3, CloudFront, Secrets Manager, CloudWatch, IAM).
- **Database / Auth:** Supabase Postgres schema, Supabase Auth, RLS policies.
- **Frontend:** Dashboard UI, shadcn/ui, Tailwind, Framer Motion, Recharts styling.

## Guidance

- Do not import the Gemini client from client-side React components; go through `/api/*` routes.
- Do not call Mapbox secret-scoped endpoints from the browser. Route them through server code that reads `MAPBOX_SECRET_TOKEN`.
- Prompts live in `src/lib/gemini/prompts.ts`. Treat them as code — review them like any other module.
- All AI services must return a sensible deterministic fallback so the dashboard never renders blank.
- AWS infrastructure is future-facing. Keep the codebase local-first and environment-driven; do not hardcode AWS endpoints in the AI layer.
- Pin new dependency versions. No unbounded ranges.
