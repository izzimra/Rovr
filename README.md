# Rovr

**AI-powered field sales intelligence for B2B reps in the Klang Valley.**

🏆 Built for the **UKM Hackathon** — placed **3rd**.

---

## The Problem

B2B field sales reps in Malaysia burn hours every morning deciding who to visit, in what order, and why. The decision is usually made with a gut feel over a CRM spreadsheet:

- **Which customer matters most today?** High-value accounts drift past renewal windows because nobody flags them.
- **What's the optimal route?** Reps zigzag across KL, Petaling Jaya, and Shah Alam losing 30–60 minutes a day to bad sequencing.
- **What's the rationale?** Managers want grounded reasoning, not "I felt like it."
- **What's the revenue impact?** Pipeline visibility stops at CSV exports — no live projections, no opportunity scoring.

Existing tools solve one piece (mapping, CRM, BI dashboards) but not the full decision loop. Reps end up with three tabs open and still no plan.

## The Solution

Rovr is a single dark-mode dashboard that takes a CSV of customer locations and returns a complete morning plan:

1. **Prioritise** — a deterministic scoring engine ranks every account (sales value, priority, potential, proximity), then Gemini 2.5 Flash writes VP-grade justifications for the top N.
2. **Optimise** — nearest-neighbour routing over a Mapbox travel matrix picks the best visit sequence and a Mapbox polyline renders it live on the map.
3. **Explain** — four AI insight cards (opportunity, risk, strategy, route reasoning) plus a daily executive brief sit above the map.
4. **Chat** — a stateless Gemini copilot panel answers questions grounded in the current session data ("Who should I visit first?", "Which accounts are going stale?").

Every AI surface has a deterministic fallback, so the dashboard never renders blank — even if Gemini is down or rate-limited.

## Stack

| Area             | Choice                                            |
| ---------------- | ------------------------------------------------- |
| Framework        | Next.js 15 (App Router), React 19, TypeScript 5.6 |
| AI               | Gemini 2.5 Flash via `@google/generative-ai`      |
| Maps             | Mapbox GL JS, Directions API, Matrix API          |
| Auth + DB        | Supabase (Postgres, Auth, RLS)                    |
| State            | Zustand 5                                         |
| Styling          | Tailwind CSS, Framer Motion, Lucide icons         |
| CSV ingestion    | PapaParse                                         |
| Target infra     | AWS (Amplify, S3, CloudFront)                     |

## Architecture

```
CSV upload / Demo Mode
        │
        ▼
┌─────────────────────────┐
│ Scoring Engine          │  deterministic 0–100 composite
│ (src/lib/scoring)       │  sales × 0.4 + priority × 0.3
└──────────┬──────────────┘  + potential × 0.2 − distance × 0.1
           │
           ▼
┌─────────────────────────┐
│ /api/prioritize         │  Gemini writes top-N explanations
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Route Optimizer         │  Mapbox Matrix API → nearest-neighbour
│ (src/lib/route-optimizer)│ → haversine fallback if token missing
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ KPI Engine              │  revenue projection, efficiency,
│ (src/lib/analytics)     │  travel savings, opportunity score
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐   ┌───────────────────────────┐
│ /api/insights  ──────── │ + │ /api/briefing             │
│ 4 AI insight cards      │   │ executive daily brief     │
└─────────────────────────┘   └───────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│ /api/chat               │  stateless copilot, history
│                         │  session-only per requirements
└─────────────────────────┘
```

### Key design decisions

- **Every AI service has a deterministic fallback.** Gemini rate-limits, times out, or returns invalid JSON — the dashboard still shows grounded numeric insights.
- **Schema-constrained JSON.** Gemini calls use `responseSchema` so output is always parsable, never free-form.
- **Observability in the envelope.** Every `/api/*` response carries `{ fallback, fallbackReason, attempts, retries, latencyMs }` in its `meta` field.
- **Ownership boundaries.** AI layer (`src/lib/ai`, `src/lib/gemini`, `src/app/api`) stays independent of Mapbox rendering and Supabase schema.

## Project Structure

```
src/
├── app/
│   ├── api/             # Next.js server routes
│   │   ├── prioritize/
│   │   ├── insights/
│   │   ├── briefing/
│   │   ├── chat/
│   │   └── customers/import/
│   ├── (pages)/         # dashboard, customers, territories, analytics, settings
│   ├── layout.tsx
│   └── page.tsx
├── components/          # React UI (shell, map, dashboard panels)
├── lib/
│   ├── ai/              # high-level AI composition + fallbacks
│   ├── gemini/          # Gemini client, prompts, schemas
│   ├── scoring/         # deterministic ranking engine
│   ├── analytics/       # KPIs + revenue projection
│   ├── maps/            # Mapbox Directions + Matrix wrappers
│   ├── mock/            # 18 Klang Valley seed customers
│   ├── orchestration/   # dashboard bootstrap pipeline
│   └── supabase/        # server-side SSR client
├── store/               # Zustand stores (customer, ai, route, kpi)
└── types/               # shared domain types
```

## Running Locally

### Prerequisites

- Node.js 18.17+ (recommend 20 LTS)
- npm

### Environment

Copy `.env.example` to `.env.local` and fill in:

```
# Client-safe
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MAPBOX_TOKEN=pk....

# Server-only
MAPBOX_SECRET_TOKEN=...
GEMINI_API_KEY=...
```

Without a Gemini key, all AI endpoints still work — they return deterministic fallback copy that's indistinguishable from live output. Without a Mapbox token, the Matrix and Directions APIs fall back to haversine mocks.

### Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Features

- 📊 **KPI bar** — Estimated Revenue, Route Efficiency, Travel Saved, Priority Customers
- 🤖 **AI insight cards** — opportunity, risk, strategy, route reasoning
- 📍 **Live map** — Mapbox GL with tier-coloured numbered markers + route polyline
- 📋 **Ranked customer list** — AI-authored justifications per account
- 💬 **Copilot chat** — Gemini-powered Q&A grounded in session data
- 🎬 **Demo Mode** — 18 realistic Klang Valley accounts seeded on first load
- 📤 **CSV import** — validates, auto-ranks, reseeds pipeline
- 🌙 **Dark-mode-only** dashboard tuned for long sessions

## API

All AI endpoints wrap responses in a shared envelope:

```ts
{
  data: T,
  meta: {
    model: "gemini-2.5-flash",
    latencyMs: number,
    fallback: boolean,
    fallbackReason?: "gemini_error" | "rate_limited" | "no_api_key" | ...,
    attempts: number,
    retries: number,
    service: "prioritization" | "insights" | "daily_brief" | "copilot" | ...
  }
}
```

| Endpoint                   | Method | Purpose                               |
| -------------------------- | ------ | ------------------------------------- |
| `/api/prioritize`          | POST   | Rank customers + generate reasoning   |
| `/api/insights`            | POST   | 4 territory intelligence cards        |
| `/api/briefing`            | POST   | Executive daily brief                 |
| `/api/chat`                | POST   | Copilot Q&A (stateless)               |
| `/api/customers/import`    | POST   | Upload CSV, RLS-scoped Supabase insert |

## CSV Format

Required columns: `customer_name`, `latitude`, `longitude`
Optional columns: `sales_value`, `priority` (0–10), `last_visit_days`, `potential_score` (0–100)

Headers are case-insensitive and whitespace-tolerant.

## Credits

Built for the **UKM Hackathon** — 3rd place finish 🥉

Team focus areas:
- AI + Product Intelligence layer
- Mapbox + routing infrastructure
- Supabase schema + auth
- Frontend dashboard + design system

## License

Proprietary — hackathon submission.
