# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## Project Overview

**Feztival** (formerly called Setlist) is a web marketplace connecting musicians, DJs, and bands with event organizers in Brazil. Initial market: Porto Alegre, RS.

**Type:** PWA (web-first, no native app)
**Project lead:** Bernardo — goal is to lead developers, not write all the code himself. Explanations should support his understanding and decision-making.

---

## Architecture Overview

Feztival is split into **two applications**: a structured backend API and a React frontend that consumes it. The frontend never talks to the database directly — all data and business rules go through the API.

```
Next.js (frontend)  →  NestJS API (backend)  →  PostgreSQL
                        ↑
                        business rules, authentication and authorization live here
```

Both apps live in a single **monorepo**:

```
feztival/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # shared TypeScript types/DTOs consumed by both
└── package.json      # workspace root
```

The `packages/shared` folder lets the frontend reuse the backend's request/response types, so the API contract stays in sync across both apps.

> **History / abandoned directions:** Earlier notes mention Django + vanilla HTML, and later a "Supabase direct + RLS" model where the frontend hit the database directly. Both are abandoned. The definitive architecture is a **structured NestJS backend** with a **React frontend consuming its REST API**. Security is enforced in the backend (guards + service logic), not by database RLS.

---

## Tech Stack

### Backend (API)

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | NestJS (modules, controllers, providers, dependency injection) |
| ORM | TypeORM — **Code First** (entities in code → migrations → database) |
| Database | PostgreSQL |
| Validation | class-validator + class-transformer (DTOs) |
| Auth | JWT (Passport strategy in Nest) |
| API docs / testing | Swagger (OpenAPI, native `@nestjs/swagger`) |
| Payments | Pagar.me (PIX, boleto, credit card, split/escrow) |
| Media storage | Cloudflare R2 |
| Email | Resend or SendGrid |

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS (mobile-first, `md:` and `xl:` breakpoints) |
| API access | Consumes the NestJS REST API (typed HTTP client) |
| Geolocation | Google Maps API |

> Next.js is used as the frontend framework (chosen for SEO on artist profiles/listings — server rendering + indexing). It is a **pure client of the API**: it calls the NestJS backend and never touches the database directly. Server Components / Route Handlers may proxy or forward requests to the API, but business rules and data access stay in the backend.

### Hosting

| App | Where | Why |
|---|---|---|
| Frontend | Vercel | Auto-deploy on GitHub push, great for React/Next |
| Backend | Railway / Render / Fly.io | Long-running server (Vercel serverless is a poor fit for Nest) |
| Database | **Supabase (managed PostgreSQL only)** | Used purely as the Postgres database — no Auth, RLS, Storage or SDK |

> **Supabase is only the database.** The NestJS backend connects to Supabase's Postgres via a standard connection string (`DATABASE_URL`); TypeORM Code First migrations run against it. Supabase Auth, RLS, Storage and the JS client are **not** used — authentication is JWT in the backend and media lives in Cloudflare R2.
>
> Connection note: use Supabase's **direct connection** (or session pooler) for the long-running Nest server and for running migrations. Avoid the transaction pooler for migrations.

---

## Backend Architecture (layered)

The backend follows a classic layered architecture with dependency injection. Each layer has one job and depends on the layer below through an **interface**, never a concrete class.

```
HTTP request
   ↓
Controller     receives request, validates input via DTO, no business logic
   ↓
Service        business rules (e.g. "an artist cannot book themselves")
   ↓
Repository     data access (interface + TypeORM implementation)
   ↓
Entity/Model   class mapped to a table (@Entity / @Column)
   ↓
PostgreSQL
```

**Key principle — depend on interfaces, inject implementations:**
A service depends on `IBookingRepository` (a contract), and Nest injects the concrete `BookingRepository` at runtime. This keeps services decoupled from TypeORM and testable (the repository can be mocked).

### Suggested project structure

```
src/
├── main.ts                     # bootstrap + Swagger setup
├── app.module.ts
├── common/                     # guards, interceptors, filters, shared types
├── config/                     # env, database config
├── database/
│   └── migrations/             # Code First migrations (generated from entities)
└── modules/
    └── bookings/               # one module per domain
        ├── bookings.module.ts
        ├── bookings.controller.ts
        ├── bookings.service.ts
        ├── dto/                # CreateBookingDto, UpdateBookingDto...
        ├── entities/           # booking.entity.ts (@Entity, the Model)
        ├── interfaces/         # ibooking.repository.ts (contract)
        └── repositories/       # booking.repository.ts (TypeORM impl)
```

One **module per domain** (artists, bookings, auth, media, reviews...). Modules stay small and focused.

**Build order rule — never invert:**
1. Model the domain in **entities** (Code First classes)
2. Generate and review **migrations** (the SQL that hits Postgres)
3. Build **repositories + interfaces** (data access)
4. Build **services** (business rules) and **controllers** (HTTP + DTO validation)
5. Build the **frontend** screens that consume those endpoints

---

## Local Development

### Backend

```bash
npm install                          # install dependencies
npm run start:dev                    # Nest dev server (watch mode)
npm run migration:generate           # generate migration from entity changes
npm run migration:run                # apply migrations to the database
npm run test                         # unit tests
```

Swagger UI is served (typically at `/docs`) for exploring and testing endpoints.

### Frontend

```bash
npm install
npm run dev                          # dev server
npm run build
```

All secrets and API keys go in `.env` (backend) / `.env.local` (frontend) — **never** in the repository.

---

## Domain Model (entities)

Modeled **Code First** as TypeORM entities; migrations create the tables.

| Entity | Purpose |
|---|---|
| `User` | Account + credentials (email, hashed password) |
| `Profile` | User data (name, type: artista/cliente, city) |
| `Category` | Artist types (DJ, band, solo musician, etc.) |
| `Service` | Services offered by each artist |
| `Media` | Photos, audio, mixes linked to profiles (stored in R2) |
| `Availability` | Artist schedule/calendar |
| `Booking` | Contracts between client and artist |
| `Message` | Messages per booking thread |
| `Review` | Post-event ratings (both directions) |
| `Notification` | Notification queue per user |

**Authorization rule:** enforced in the backend (guards + service checks). An artist can only read/write their own data; a client can only access their own bookings. This logic lives in services, **not** in the database.

---

## Pages (frontend)

| Page | Route |
|---|---|
| Home | `/` |
| Artist listing | `/artistas` |
| Artist profile | `/artista/[slug]` |
| Booking form | `/reservar/[slug]` |
| Login / Register | `/entrar` |
| Artist dashboard | `/painel` |
| Client bookings | `/minhas-reservas` |

---

## Visual Identity

- **Background:** `#0a0a0a` (pure black)
- **Cards:** `#111111`, borders `#1a1a1a`
- **Logo colors per letter:** F=`#FFD600` e=`#FF6B35` z=`#FF3CAC` t=`#B36AFF` i=`#00D4FF` v=`#FFD600` a=`#FF6B35` l=`#FF3CAC`
- **Typography:** Inter / System UI, weight 500, `letter-spacing: -1px` on headings

---

## What Is Out of Scope

- Native mobile app (App Store / Google Play)
- Direct chat/messaging between artist and client (Q&A public section only)
- Tinder-style feed (like/dislike)

---

## Current Phase (July 2026)

Marco 1 — Figma design (April–June 2026). Code not started yet. Next milestone is M2: project running locally with the NestJS API (auth + initial entities/migrations) and the Next.js frontend consuming it.

Confirmed decisions:
- Frontend framework: **Next.js** (App Router) — chosen for SEO
- Repository layout: **monorepo** (`apps/api` + `apps/web` + `packages/shared`)
