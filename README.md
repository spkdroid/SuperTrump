# 🃏 Super Trump — Scoring System

A full-stack, Dockerised scoring dashboard for the card game **Super Trump**.  
Track players, record rounds, calculate scores automatically using the official rules, and watch live leaderboards update in real time.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development (without Docker)](#local-development-without-docker)
- [Scoring Rules Implemented](#scoring-rules-implemented)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Details |
|---|---|
| 🧑‍🤝‍🧑 **Player Profiles** | Create players with names & colour avatars; lifetime stats tracked |
| 🎮 **Game Management** | Start games with 3–10 players, end games, declare winners |
| 🃏 **Round Recording** | 4-step guided wizard: Bid → Teams → Result → Confirm |
| 📊 **Live Leaderboard** | Per-game standings with rank badges and score chips |
| 📈 **Score Progression Chart** | ApexCharts line chart — updates after every round |
| 🧮 **Scoring Engine** | Full Super Trump multiplier rules (Normal / Honors / 56 / Upgraded-56) |
| 🔁 **Undo Round** | Delete any round and automatically reverse all scores |
| 🏆 **Global Leaderboard** | All-time rankings, win rates, bidder success rates |
| 🌙 **Dark Theme** | Vuetify 3 custom deep-green dark theme |
| 🐳 **Fully Dockerised** | One command to build and run everything |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                                                      │
│  ┌─────────────────┐      ┌──────────────────────┐  │
│  │  supertrump-    │      │  supertrump-backend  │  │
│  │   frontend      │─────▶│  Node.js / Express   │  │
│  │  Vue 3 + Nginx  │ /api │  Port 3000 (internal)│  │
│  │  Port 8080 ◀────┼──────┤                      │  │
│  │  (host)         │      └──────────┬───────────┘  │
│  └─────────────────┘                 │               │
│                                      ▼               │
│                          ┌───────────────────────┐   │
│                          │  supertrump-db        │   │
│                          │  PostgreSQL 15        │   │
│                          │  Port 5432 (internal) │   │
│                          └───────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

- **Frontend** — Vue 3, Vuetify 3, Pinia, Vue Router, ApexCharts; built by Vite into static files served by Nginx.  
- **Backend** — Node.js 18, Express 4; all `/api/*` requests proxied from Nginx.  
- **Database** — PostgreSQL 15 with a schema initialised automatically on first boot via `db/init.sql`.

---

## Project Structure

```
SuperTrump/
├── docker-compose.yml          # Orchestrates all three services
├── Rules.md                    # Original game rules (source of truth)
│
├── db/
│   └── init.sql                # Full schema: players, games, rounds, leaderboard
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              # Express app entry point
│       ├── db.js               # pg Pool + waitForDB
│       ├── scoring.js          # Core scoring engine (multipliers, formulas)
│       └── routes/
│           ├── players.js      # CRUD for player profiles
│           ├── games.js        # Game lifecycle + per-game leaderboard
│           ├── rounds.js       # Record / undo rounds + score propagation
│           ├── leaderboard.js  # Global rankings + dashboard stats
│           └── scoring.js      # POST /scoring/calculate (preview only)
│
└── frontend/
    ├── Dockerfile              # Multi-stage: Vite build → Nginx
    ├── nginx.conf              # SPA fallback + /api proxy
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.js             # App bootstrap, Vuetify theme
        ├── App.vue             # Shell: nav drawer + notification toasts
        ├── api/index.js        # Axios client + all API helpers
        ├── router/index.js     # Vue Router (history mode)
        ├── store/index.js      # Pinia store (notifications)
        ├── utils/scoring.js    # Client-side scoring mirror + chart builder
        ├── views/
        │   ├── Dashboard.vue   # Stats cards + global top-5 leaderboard
        │   ├── Players.vue     # Player roster, create/edit/delete
        │   ├── Games.vue       # Game list, create new game
        │   ├── GameDetail.vue  # Live standings, chart, round history
        │   └── Leaderboard.vue # All-time rankings table
        └── components/
            ├── RoundEntry.vue  # 4-step stepper wizard to record a round
            └── RoundHistory.vue# Collapsible round-by-round history
```

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Docker Desktop | 24.x | `docker --version` |
| Docker Compose | v2 (bundled) | `docker compose version` |

> **That's it.** No Node.js, Python, or database installation needed on your host machine.

---

## Quick Start (Docker)

### 1 — Clone / open the project

```bash
cd /path/to/SuperTrump
```

### 2 — Build and start all containers

```bash
docker compose up --build -d
```

This single command will:

1. Pull `postgres:15-alpine` and `node:18-alpine` base images  
2. Build the backend Node.js image  
3. Build the frontend (Vite production bundle) and package it into Nginx  
4. Start all three containers in the correct dependency order  
5. Run `db/init.sql` to create the full schema on first boot  

> First build takes **2–4 minutes** depending on your internet speed.  
> Subsequent builds are much faster due to Docker layer caching.

### 3 — Open the app

```
http://localhost:8080
```

### 4 — Stop the app

```bash
docker compose down
```

### 4a — Stop and wipe all data (full reset)

```bash
docker compose down -v
```

---

## Local Development (without Docker)

If you want hot-reloading during development, run the three services individually.

### Database

```bash
# Requires a local PostgreSQL 15 instance
psql -U postgres -c "CREATE DATABASE supertrump;"
psql -U postgres -d supertrump -f db/init.sql
```

### Backend

```bash
cd backend
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supertrump \
PORT=3000 \
node src/app.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server at http://localhost:5173
                   # /api requests are proxied to http://localhost:3000
```

---

## Scoring Rules Implemented

All rules are derived directly from [Rules.md](Rules.md).

### Bid Types & Multipliers

| Bid Type | Condition | Multiplier | Win (Bidder) | Loss (Bidder) |
|---|---|---|---|---|
| **Normal** | 28 – 39 | 1× | `+(bid ÷ 2)` | `-(bid)` |
| **Honors** | 40 – 55 | 2× | `+(bid)` | `-(bid × 2)` |
| **Initial 56** | Bid of 56 from the start | 4× | `+112` | `-224` |
| **Upgraded 56** | Changed to 56 mid-game | 3× | `+84` | `-168` |

### Points Distribution

- **Bidder** receives 50 % of the total scoring pool.  
- **Partners** share the remaining 50 % equally.  
- **Opponents** score **0** points regardless of outcome.  
- On a **loss**, everyone's score is doubled negative.

### Examples

```
Bid 36, Won  → Bidder +18,  Partners share +18
Bid 36, Lost → Bidder -36,  Partners share -36
Bid 40, Won  → Bidder +40,  Partners share +40  (Honors 2×)
Bid 40, Lost → Bidder -80,  Partners share -80
Bid 56, Won  → Bidder +112, Partners share +112  (4× normal)
Bid 56, Lost → Bidder -224, Partners share -224
Mid-game 56, Won  → Bidder +84,  Partners share +84
Mid-game 56, Lost → Bidder -168, Partners share -168
```

---

## API Reference

Base URL: `http://localhost:8080/api` (proxied through Nginx)

### Players

| Method | Endpoint | Description |
|---|---|---|
| GET | `/players` | List all players (sorted by total score) |
| GET | `/players/:id` | Player profile + recent games |
| POST | `/players` | Create player `{ name, avatar_color? }` |
| PUT | `/players/:id` | Update name / avatar |
| DELETE | `/players/:id` | Remove player |

### Games

| Method | Endpoint | Description |
|---|---|---|
| GET | `/games` | List all games (`?status=active\|completed`) |
| GET | `/games/:id` | Game detail with players |
| POST | `/games` | Create game `{ name?, playerIds[] }` |
| PUT | `/games/:id` | Rename game |
| DELETE | `/games/:id` | Delete game |
| POST | `/games/:id/complete` | End game, assign ranks, update lifetime stats |
| GET | `/games/:id/leaderboard` | Live standings for this game |
| GET | `/games/:id/rounds` | All rounds for this game |

### Rounds

| Method | Endpoint | Description |
|---|---|---|
| POST | `/games/:gameId/rounds` | Record a round (see payload below) |
| GET | `/rounds/:id` | Fetch single round detail |
| DELETE | `/rounds/:id` | Undo round + reverse all scores |

**Round payload:**
```json
{
  "bidderId": 3,
  "bidAmount": 40,
  "bidType": "honors",
  "trumpSuit": "hearts",
  "partnerIds": [1, 5],
  "opponentIds": [2, 4],
  "pointsWonByBiddingTeam": 44,
  "partnerCardsAsked": "Jack of Hearts",
  "notes": "Optional free text"
}
```

### Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaderboard` | All-time global rankings |
| GET | `/leaderboard/stats` | Dashboard aggregate stats |

### Scoring Calculator

| Method | Endpoint | Description |
|---|---|---|
| POST | `/scoring/calculate` | Preview scores without saving |

**Payload:**
```json
{ "bidAmount": 40, "bidType": "honors", "bidWon": true, "numPartners": 2 }
```

---

## Environment Variables

These are set inside `docker-compose.yml` and do not need a `.env` file for the Docker setup.

| Variable | Service | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | backend | `postgresql://supertrump:supertrump_pass@db:5432/supertrump` | PostgreSQL connection string |
| `PORT` | backend | `3000` | Express listening port |
| `NODE_ENV` | backend | `production` | Node environment |
| `POSTGRES_DB` | db | `supertrump` | Database name |
| `POSTGRES_USER` | db | `supertrump` | DB username |
| `POSTGRES_PASSWORD` | db | `supertrump_pass` | DB password |

---

## Useful Commands

```bash
# Build and start everything
docker compose up --build -d

# View logs (all services)
docker compose logs -f

# View logs (single service)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Rebuild only one service after a code change
docker compose build --no-cache backend
docker compose up -d backend

docker compose build --no-cache frontend
docker compose up -d frontend

# Connect to the database directly
docker exec -it supertrump-db psql -U supertrump -d supertrump

# Health check
curl http://localhost:8080/api/health

# Stop (keep data)
docker compose down

# Stop and wipe all data
docker compose down -v

# Check running containers
docker compose ps
```

---

## Troubleshooting

### Port 8080 already in use

```bash
# Find and kill the process using port 8080
lsof -ti:8080 | xargs kill -9
# Then restart
docker compose up -d
```

### Frontend shows blank page

```bash
docker logs supertrump-frontend
# If nginx reports missing files, rebuild
docker compose build --no-cache frontend && docker compose up -d frontend
```

### Backend can't connect to database

The backend automatically retries the DB connection 20 times (3 s apart).  
If it still fails, check:

```bash
docker compose logs db       # Is Postgres healthy?
docker compose logs backend  # Which error is thrown?
docker compose restart backend
```

### Schema not created / tables missing

The `db/init.sql` only runs once on the **first** container start.  
If you need to re-run it after changing the schema:

```bash
docker compose down -v           # Wipe the volume
docker compose up --build -d     # Fresh start
```

### Scores look wrong after an undo

The undo (`DELETE /rounds/:id`) reverses every player's score atomically in a transaction. If you suspect data drift, open a DB shell and verify:

```sql
-- Recompute expected score for a game
SELECT player_id, SUM(score) FROM round_players WHERE game_id = 1 GROUP BY player_id;

-- Compare with stored value
SELECT player_id, current_score FROM game_players WHERE game_id = 1;
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue 3 (Composition API) |
| UI component library | Vuetify 3 |
| State management | Pinia |
| Routing | Vue Router 4 |
| Charts | ApexCharts + vue3-apexcharts |
| HTTP client | Axios |
| Build tool | Vite 5 |
| Backend | Node.js 18 + Express 4 |
| Database | PostgreSQL 15 |
| DB client | node-postgres (pg) |
| Web server | Nginx (Alpine) |
| Containerisation | Docker + Docker Compose v2 |
