# Project Structure

## Overview

The repository contains the AI intelligence foundation for Rovr. UI, Mapbox maps/routing, Supabase infra, and AWS deployment work live in parallel tracks owned by other teammates.

## Current Layout

```
.
├── .kiro/
│   ├── specs/rovr-platform/     # Feature specs (requirements, etc.)
│   └── steering/                # AI assistant steering rules
├── src/
│   ├── app/
│   │   └── api/                 # Next.js App Router server routes
│   │       ├── _lib/envelope.ts # Shared API response envelope
│   │       ├── prioritize/
│   │       ├── insights/
│   │       ├── briefing/
│   │       └── chat/
│   ├── lib/
│   │   ├── gemini/              # Gemini client, prompts, services
│   │   ├── scoring/             # Deterministic scoring + ranking
│   │   ├── analytics/           # KPI + revenue + efficiency calcs
│   │   ├── ai/                  # High-level AI service composition
│   │   └── mock/                # Customer, route, insight seed data
│   ├── store/                   # Zustand stores (customer, ai, route, kpi)
│   └── types/                   # Shared domain types (includes Mapbox shapes)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Ownership

- `src/lib/**`, `src/types/**`, `src/store/**`, `src/app/api/**` — AI + Product Intelligence lead.
- `src/app/(dashboard)/**`, `src/components/**`, UI styling — frontend teammates.
- Mapbox integration (GL JS rendering, Directions API, Matrix API) and AWS infrastructure (Amplify, S3, CloudFront, Secrets Manager, CloudWatch, IAM) — maps/infrastructure teammate.
- Supabase schema, Supabase Auth, RLS policies — database/auth teammate.

## Naming

- Spec and feature directories: `kebab-case`.
- Module files: `camelCase.ts` or `kebab-case.ts` matching the existing pattern in each folder.
- Types: `PascalCase`. Store hooks: `useXxxStore`.

## Guidance

- Put new AI prompts in `src/lib/gemini/prompts.ts`, not inline in services.
- Keep `src/types/*` free of runtime logic — types only. Mapbox response shapes live here alongside the domain types.
- Every AI service should have a deterministic fallback path so the dashboard stays populated if Gemini is down.
- Do not add UI components, charts, or Mapbox rendering under `src/lib/**`.
- AWS infrastructure is future-facing; do not hardcode AWS endpoints or clients into the AI layer.
