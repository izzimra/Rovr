# Product

## Overview

**Rovr** is an AI-powered field sales intelligence platform. Sales reps upload a CSV of customer locations, Rovr prioritises visits with Gemini, optimises travel with Mapbox, and surfaces KPIs, AI insights, and a copilot chat inside a single dark-mode dashboard. Authentication and relational storage run on Supabase; production deployment targets AWS.

Primary users: B2B field sales reps in the Klang Valley (Kuala Lumpur, Petaling Jaya, Shah Alam, Subang, Bangi). MVP scope is hackathon-grade; authoritative requirements live in `.kiro/specs/rovr-platform/requirements.md`.

## Status

- Requirements document: `.kiro/specs/rovr-platform/requirements.md`.
- AI intelligence layer foundation is implemented (`src/lib/**`, `src/store/**`, `src/app/api/**`).
- Frontend dashboard, Mapbox rendering, Supabase schema, auth flows, and AWS infrastructure are in-flight with other teammates.

## Guidance

- Keep AI output grounded in the structured context we pass to Gemini. Never invent customers, revenue, or routes.
- Currency and locale conventions: Malaysian Ringgit (RM), `en-MY` number formatting.
- Every AI-powered surface must have a deterministic fallback so the dashboard renders even when Gemini is unavailable.
- Do not add features outside the requirements document without updating it first.
