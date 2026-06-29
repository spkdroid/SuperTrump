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
- [Tech Stack](#tech-stack)
- [Deploying to AWS](#deploying-to-aws)
  - [Option A — EC2 + Docker Compose](#option-a--ec2--docker-compose-recommended)
  - [Option B — ECS Fargate + RDS](#option-b--ecs-fargate--rds-production-grade)
  - [HTTPS with Let's Encrypt](#https-with-lets-encrypt-option-a-only)
  - [HTTPS with ACM + ALB](#https-with-acm--alb-option-b-only)
  - [Environment Variables (Production)](#environment-variables-production)
  - [Security Checklist](#security-checklist)
  - [Estimated AWS Costs](#estimated-aws-costs)
  - [CI/CD with GitHub Actions](#cicd-with-github-actions-optional)

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
├── docker-compose.yml          # Local development orchestration
├── docker-compose.prod.yml     # Production orchestration (port 80, secure env)
├── .env.example                # Template for production secrets
├── .gitignore
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
        │   ├── Leaderboard.vue # All-time rankings table
        │   └── PlayerScores.vue# Live per-player playing-card view (/games/:id/live)
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

---

---

# Deploying to AWS

Two deployment paths are provided. Choose the one that fits your scale:

| | Option A — EC2 + Docker Compose | Option B — ECS Fargate + RDS |
|---|---|---|
| **Complexity** | Low | Medium–High |
| **Cost (est.)** | ~$20–30/month | ~$60–80/month |
| **Scaling** | Manual | Auto-scaling |
| **DB backup** | Manual `pg_dump` | Automated RDS snapshots |
| **Best for** | Personal / small group use | Teams / production traffic |

---

## Option A — EC2 + Docker Compose (Recommended)

A direct lift-and-shift of the local Docker setup onto a single EC2 instance.

### Architecture

```
Internet
    │
    ▼
┌───────────────────────────────────────────┐
│  EC2 Instance (t3.small or t3.medium)     │
│  Ubuntu 22.04 LTS                         │
│                                           │
│  ┌────────────────────────────────────┐   │
│  │  docker-compose.prod.yml           │   │
│  │  ├─ supertrump-frontend  :80       │   │
│  │  ├─ supertrump-backend   :3000     │   │
│  │  └─ supertrump-db        :5432     │   │
│  └────────────────────────────────────┘   │
│                                           │
│  Elastic IP  ◀── Security Group (80/443)  │
└───────────────────────────────────────────┘
         │
    Route 53 (optional)
    yourdomain.com → Elastic IP
```

---

### Step 1 — Launch an EC2 Instance

1. Open the [EC2 Console](https://console.aws.amazon.com/ec2) → **Launch Instance**.
2. Configure:

| Setting | Recommended value |
|---|---|
| **Name** | `supertrump-server` |
| **AMI** | Ubuntu Server 22.04 LTS (Free Tier eligible) |
| **Instance type** | `t3.small` (2 vCPU / 2 GB) minimum; `t3.medium` if 6+ concurrent users |
| **Key pair** | Create new → download `.pem` and store it safely |
| **Storage** | 20 GB gp3 |

3. Under **Network settings → Create security group**, allow:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | **Your IP only** (e.g. `1.2.3.4/32`) |
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |

4. Click **Launch Instance**.

---

### Step 2 — Allocate an Elastic IP

Without an Elastic IP your server's public IP changes on every reboot.

1. EC2 Console sidebar → **Elastic IPs → Allocate Elastic IP address → Allocate**.
2. Select the new EIP → **Actions → Associate Elastic IP address** → choose your instance.

Note the IP — you will use it for SSH, the browser, and DNS.

---

### Step 3 — Connect to the Instance

```bash
# On your local machine
chmod 400 ~/Downloads/supertrump-key.pem
ssh -i ~/Downloads/supertrump-key.pem ubuntu@YOUR_ELASTIC_IP
```

---

### Step 4 — Install Docker on the EC2 Instance

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker (official script)
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

### Step 5 — Upload the Project

**Option 5a — Git (recommended)**

```bash
# On the EC2 instance
sudo apt-get install -y git
git clone https://github.com/YOUR_USERNAME/SuperTrump.git
cd SuperTrump
```

**Option 5b — rsync from your local machine**

```bash
# Run this on your LOCAL machine (not on EC2)
rsync -avz \
  --exclude 'node_modules' --exclude '.git' --exclude 'frontend/dist' \
  -e "ssh -i ~/Downloads/supertrump-key.pem" \
  /path/to/SuperTrump/ \
  ubuntu@YOUR_ELASTIC_IP:~/SuperTrump/
```

---

### Step 6 — Create the Production `.env` File

```bash
# On the EC2 instance, inside the project folder
cp .env.example .env
nano .env
```

Replace the placeholder with a real password (16+ random characters):

```dotenv
POSTGRES_PASSWORD=Xk9#mL2pQr8vZn4w
NODE_ENV=production
```

Save (`Ctrl+X → Y → Enter`).

> **Security:** `.env` is in `.gitignore` and must never be committed to version control.

Generate a strong password with:

```bash
openssl rand -base64 24
```

---

### Step 7 — Start the Production Stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

The app is now running on **port 80**.

```bash
# Verify all containers are healthy
docker compose -f docker-compose.prod.yml ps

# Tail all logs
docker compose -f docker-compose.prod.yml logs -f
```

Open a browser: `http://YOUR_ELASTIC_IP`

---

### Step 8 — Auto-start on Reboot (systemd)

```bash
sudo nano /etc/systemd/system/supertrump.service
```

Paste (replace path if different):

```ini
[Unit]
Description=Super Trump Docker Compose
Requires=docker.service
After=docker.service network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SuperTrump
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml --env-file .env up
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable supertrump
sudo systemctl start supertrump
sudo systemctl status supertrump
```

---

### Step 9 — Point a Domain Name (Optional)

1. In your DNS provider (Route 53 / GoDaddy / Namecheap), create an **A record**:
   - **Name:** `@` (root) or `supertrump`
   - **Value:** your Elastic IP
   - **TTL:** 300 s

2. Wait a few minutes for DNS propagation, then open: `http://yourdomain.com`

---

## HTTPS with Let's Encrypt (Option A only)

Once your domain resolves to the EC2 instance, add a free SSL certificate.

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop frontend briefly so Certbot can use port 80
docker compose -f docker-compose.prod.yml stop frontend

# Obtain certificate (replace with your actual domain and email)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email you@example.com \
  --agree-tos \
  --non-interactive

# Certificates saved to:
#   /etc/letsencrypt/live/yourdomain.com/fullchain.pem
#   /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Update `frontend/nginx.conf`** to add HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root  /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location /api {
        proxy_pass         http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Update `docker-compose.prod.yml`** — mount certs and expose port 443:

```yaml
  frontend:
    ...
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

Rebuild:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

**Auto-renew** (certs expire every 90 days):

```bash
(crontab -l 2>/dev/null; echo "0 3 * * 1 certbot renew --quiet && docker compose -f /home/ubuntu/SuperTrump/docker-compose.prod.yml restart frontend") | crontab -
```

---

## Option B — ECS Fargate + RDS (Production-Grade)

Containers run on AWS-managed serverless compute; database is managed by RDS.

### Architecture

```
Internet
    │
    ▼
Route 53  →  ACM SSL Certificate
    │
    ▼
Application Load Balancer (ALB)
    │
    ├── /api/*  ──────────────▶  ECS Service: supertrump-backend
    │                             Fargate  |  port 3000
    │                                 │
    │                                 ▼
    │                          RDS PostgreSQL 15
    │                          (db.t3.micro, private subnet)
    │
    └── /*  ──────────────────▶  ECS Service: supertrump-frontend
                                  Fargate  |  port 80
```

---

### Prerequisites

```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g. ap-southeast-1), Output: json
```

The IAM user needs these AWS managed policies:
`AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryFullAccess`, `AmazonRDSFullAccess`, `AmazonSSMFullAccess`, `ElasticLoadBalancingFullAccess`

---

### Step 1 — Create ECR Repositories

```bash
export AWS_REGION=ap-southeast-1   # change to your region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name supertrump-backend  --region $AWS_REGION
aws ecr create-repository --repository-name supertrump-frontend --region $AWS_REGION
```

---

### Step 2 — Build and Push Docker Images

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Backend
docker build -t supertrump-backend ./backend
docker tag  supertrump-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/supertrump-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/supertrump-backend:latest

# Frontend
docker build -t supertrump-frontend ./frontend
docker tag  supertrump-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/supertrump-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/supertrump-frontend:latest
```

---

### Step 3 — Create RDS PostgreSQL Instance

1. [RDS Console](https://console.aws.amazon.com/rds) → **Create database**.

| Setting | Value |
|---|---|
| Engine | PostgreSQL 15 |
| Template | Free tier / Production |
| Instance class | `db.t3.micro` (free tier) or `db.t3.small` |
| Identifier | `supertrump-db` |
| Master username | `supertrump` |
| Master password | `<strong password>` |
| Initial DB name | `supertrump` |
| VPC | Same VPC as ECS cluster |
| Public access | **No** |
| Security group | Allow port 5432 from ECS security group only |

2. Note the **Endpoint** once the instance is available.

**Load schema into RDS** (from your local machine):

```bash
PGPASSWORD='YOUR_RDS_PASSWORD' psql \
  -h your-rds-endpoint.rds.amazonaws.com \
  -U supertrump -d supertrump \
  -f db/init.sql
```

---

### Step 4 — Store Secrets in Parameter Store

```bash
aws ssm put-parameter \
  --name "/supertrump/database-url" \
  --value "postgresql://supertrump:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/supertrump" \
  --type SecureString \
  --region $AWS_REGION
```

---

### Step 5 — Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name supertrump-cluster \
  --region $AWS_REGION
```

---

### Step 6 — Register Task Definitions

Save as `supertrump-backend-task.json` (replace `ACCOUNT_ID` and `REGION`):

```json
{
  "family": "supertrump-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "backend",
    "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/supertrump-backend:latest",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "PORT",     "value": "3000"       },
      { "name": "NODE_ENV", "value": "production" }
    ],
    "secrets": [{
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:ssm:REGION:ACCOUNT_ID:parameter/supertrump/database-url"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/supertrump-backend",
        "awslogs-region": "REGION",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

Save as `supertrump-frontend-task.json`:

```json
{
  "family": "supertrump-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "frontend",
    "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/supertrump-frontend:latest",
    "portMappings": [{ "containerPort": 80 }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/supertrump-frontend",
        "awslogs-region": "REGION",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

Register them:

```bash
aws ecs register-task-definition --cli-input-json file://supertrump-backend-task.json  --region $AWS_REGION
aws ecs register-task-definition --cli-input-json file://supertrump-frontend-task.json --region $AWS_REGION
```

---

### Step 7 — Create Application Load Balancer

1. EC2 Console → **Load Balancers → Create → Application Load Balancer**.

| Setting | Value |
|---|---|
| Name | `supertrump-alb` |
| Scheme | Internet-facing |
| VPC | Your default VPC |
| Subnets | At least 2 Availability Zones |
| Security group | Allow 80 + 443 inbound from `0.0.0.0/0` |

2. Create two **Target Groups** (target type = IP):

| Name | Port | Health check path |
|---|---|---|
| `supertrump-frontend-tg` | 80 | `/` |
| `supertrump-backend-tg` | 3000 | `/api/health` |

3. **Listener rules** — port 80:
   - Default action → forward to `supertrump-frontend-tg`
   - Add rule: `path /api/*` → forward to `supertrump-backend-tg`

---

### Step 8 — Create ECS Services

```bash
# Replace SUBNET_ID_1, SUBNET_ID_2, SG_ID, and TG ARNs with your actual values

aws ecs create-service \
  --cluster supertrump-cluster \
  --service-name supertrump-backend \
  --task-definition supertrump-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID_1,SUBNET_ID_2],securityGroups=[SG_ID],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=BACKEND_TG_ARN,containerName=backend,containerPort=3000" \
  --region $AWS_REGION

aws ecs create-service \
  --cluster supertrump-cluster \
  --service-name supertrump-frontend \
  --task-definition supertrump-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID_1,SUBNET_ID_2],securityGroups=[SG_ID],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=FRONTEND_TG_ARN,containerName=frontend,containerPort=80" \
  --region $AWS_REGION
```

---

## HTTPS with ACM + ALB (Option B only)

1. [ACM Console](https://console.aws.amazon.com/acm) → **Request a public certificate**.
2. Enter `yourdomain.com` and `www.yourdomain.com` → DNS validation → **Request**.
3. Add the CNAME records shown to your DNS provider.
4. Wait for status **Issued**.
5. In the ALB, add a **port 443 listener** → HTTPS → select the ACM certificate.
6. Copy the same rules from port 80 into the 443 listener.
7. Update the port-80 listener: **Redirect → HTTPS (301)**.

---

### Route 53 (Custom Domain for Option B)

1. [Route 53](https://console.aws.amazon.com/route53) → Hosted zones → your domain.
2. Create **A record (Alias)**:
   - Name: `@`
   - Route traffic to: **Alias to Application Load Balancer** → select region + ALB
3. Repeat for `www`.

---

## Environment Variables (Production)

| Variable | Required | Where to set | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | `.env` file (EC2) | Strong random DB password |
| `DATABASE_URL` | ✅ | `.env` (EC2) or SSM Parameter Store (ECS) | Full PostgreSQL connection string |
| `NODE_ENV` | ✅ | `.env` / task definition | Must be `production` |

**Generate a strong password:**

```bash
openssl rand -base64 24
```

---

## Security Checklist

Before going live, verify every item:

- [ ] **Changed default DB password** — `supertrump_pass` is for local dev only
- [ ] **`.env` not committed to git** — confirmed in `.gitignore`
- [ ] **SSH restricted to your IP** — EC2 security group port 22 source ≠ `0.0.0.0/0`
- [ ] **Port 5432 not publicly exposed** — Postgres is internal-only
- [ ] **HTTPS enabled** — HTTP redirects to HTTPS
- [ ] **SSL certificate auto-renews** — Certbot cron or ACM managed
- [ ] **Regular DB backups** — `pg_dump` cron (EC2) or RDS automated snapshots
- [ ] **EC2 IMDSv2 enforced** — EC2 Console → Instance → Metadata → IMDSv2 = Required
- [ ] **CloudTrail enabled** — audit log of all AWS API calls in your account
- [ ] **IAM least privilege** — GitHub Actions IAM user has only the permissions it needs

---

## Estimated AWS Costs

Approximate monthly costs in `ap-southeast-1` (Singapore).

### Option A — EC2 + Docker Compose

| Resource | Size | Est. / month |
|---|---|---|
| EC2 Instance | t3.small on-demand | ~$18 |
| EBS Volume | 20 GB gp3 | ~$1.60 |
| Elastic IP (in use) | — | Free |
| Data transfer (outbound) | First 100 GB | ~$0–9 |
| **Total** | | **~$20–30** |

> 💡 A **t3.small 1-year Reserved Instance** reduces EC2 cost to ~$9/month.

### Option B — ECS Fargate + RDS

| Resource | Size | Est. / month |
|---|---|---|
| ECS Fargate — backend | 0.25 vCPU / 0.5 GB, 1 task | ~$11 |
| ECS Fargate — frontend | 0.25 vCPU / 0.5 GB, 1 task | ~$11 |
| RDS PostgreSQL | db.t3.micro, 20 GB gp2 | ~$18 |
| Application Load Balancer | — | ~$18 |
| Data transfer | — | ~$5 |
| **Total** | | **~$60–80** |

---

## CI/CD with GitHub Actions (Optional)

Automatically rebuild and deploy on every push to `main`.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Super Trump

on:
  push:
    branches: [main]

env:
  AWS_REGION:    ap-southeast-1
  ECR_BACKEND:   supertrump-backend
  ECR_FRONTEND:  supertrump-frontend

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:

      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region:            ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push backend
        run: |
          IMG=${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_BACKEND }}:${{ github.sha }}
          docker build -t $IMG ./backend && docker push $IMG

      - name: Build and push frontend
        run: |
          IMG=${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_FRONTEND }}:${{ github.sha }}
          docker build -t $IMG ./frontend && docker push $IMG

      # ── Option A: redeploy on EC2 via SSH ─────────────────────────────
      - name: SSH deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.EC2_HOST }}
          username: ubuntu
          key:      ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/SuperTrump
            git pull origin main
            docker compose -f docker-compose.prod.yml --env-file .env up --build -d

      # ── Option B: force ECS redeployment (uncomment if using ECS) ─────
      # - name: Force ECS deploy
      #   run: |
      #     aws ecs update-service --cluster supertrump-cluster \
      #       --service supertrump-backend  --force-new-deployment
      #     aws ecs update-service --cluster supertrump-cluster \
      #       --service supertrump-frontend --force-new-deployment
```

**Required GitHub Secrets** (Settings → Secrets → Actions → New repository secret):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `EC2_HOST` | Elastic IP address |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key file |

---

## Updating the App in Production

### Option A (EC2)

```bash
ssh -i ~/Downloads/supertrump-key.pem ubuntu@YOUR_ELASTIC_IP
cd ~/SuperTrump
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

### Option B (ECS)

```bash
# After pushing new images to ECR:
aws ecs update-service --cluster supertrump-cluster \
  --service supertrump-backend  --force-new-deployment --region $AWS_REGION
aws ecs update-service --cluster supertrump-cluster \
  --service supertrump-frontend --force-new-deployment --region $AWS_REGION
```

---

## Database Backup

### EC2 — manual dump

```bash
# Create a backup
docker exec supertrump-db pg_dump -U supertrump supertrump > backup_$(date +%F).sql

# Restore from backup
cat backup_2026-01-01.sql | docker exec -i supertrump-db psql -U supertrump -d supertrump
```

### RDS — automated and manual snapshots

```bash
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier supertrump-db \
  --db-snapshot-identifier supertrump-manual-$(date +%F) \
  --region $AWS_REGION
```

Automated daily snapshots (7-day retention) are enabled by default on RDS. Adjust in RDS Console → your instance → **Maintenance & backups**.
