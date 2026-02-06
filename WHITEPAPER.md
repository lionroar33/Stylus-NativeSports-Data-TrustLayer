# Sport Performance Protocol — Whitepaper

### The Performance Oracle

> Blockchain-Verified Sports Scoring | Calorie-Validated Tokenomics | Cricket as Primary Sport

**Version 1.0 — February 2026**

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. The Problem](#2-the-problem)
- [3. The Solution: The Performance Oracle](#3-the-solution-the-performance-oracle)
- [4. Technology Stack & Architecture](#4-technology-stack--architecture)
- [5. Cricket Scoring Engine (Primary Sport)](#5-cricket-scoring-engine-primary-sport)
- [6. Multi-Sport Support](#6-multi-sport-support)
- [7. Tokenomics & Deflationary Model](#7-tokenomics--deflationary-model)
- [8. Platform Modules](#8-platform-modules)
- [9. API & Data Contract](#9-api--data-contract)
- [10. User Experience](#10-user-experience)
- [11. Security & Non-Functional Requirements](#11-security--non-functional-requirements)
- [12. Roadmap](#12-roadmap)
- [13. Conclusion](#13-conclusion)

---

## 1. Executive Summary

**Sport Performance Protocol** is an open, blockchain-integrated platform that captures real-world match data from grassroots sports — with **cricket as its primary and flagship sport** — validates player effort through wearable biometric sensors, and converts verified performance into on-chain tokenomics via the **Solana blockchain**.

The system is built around three core engines collectively referred to as **"The Performance Oracle"**: a multi-sport Scoring Engine, a Calorie-Validation Engine backed by Apple HealthKit and Google Health Connect, and a Deflationary Burn Engine implemented as an Anchor (Rust) smart contract on Solana.

Unlike traditional sports platforms that simply record scores, Sport Performance Protocol creates a **Proof of Performance (PoP)** layer where every ball bowled, every goal scored, and every calorie burned is cryptographically verifiable, economically meaningful, and permanently recorded on-chain.

| Attribute | Details |
|-----------|---------|
| Primary Sport | Cricket (Box Cricket, T10, T20, ODI, Custom) |
| Additional Sports | 15+ across individual, paired, and team categories |
| Backend | NestJS (TypeScript), PostgreSQL, Redis |
| Blockchain | Solana (Anchor / Rust smart contracts) |
| Biometric Layer | Apple HealthKit, Google Health Connect |
| Token Model | Deflationary burn tied to performance-to-effort ratio |

---

## 2. The Problem

Grassroots sport — the millions of weekend cricket matches, local football leagues, badminton clubs, and community tournaments played every day — is the world's largest untapped performance dataset.

### 2.1 No Trusted Data Layer

Local match scores are recorded on paper, WhatsApp groups, or ad-hoc apps with no standardization, no immutability, and no way to verify authenticity. A player's claim of a 50-run innings or a 5-wicket haul is anecdotal at best.

### 2.2 No Connection Between Effort and Reward

Existing sports platforms reward engagement (likes, views, fantasy picks) — not actual athletic performance. There is no mechanism to verify that a player was physically on the field, let alone that they performed at the level they claim.

### 2.3 No Economic Layer for Grassroots Athletes

Professional athletes benefit from sponsorships, broadcast deals, and data-driven career platforms. Grassroots players have none of this. Their performance data — however exceptional — generates zero economic value.

### 2.4 Fragmented Scoring Tools

Cricket alone has dozens of scoring apps, none of which interoperate or produce verifiable data. Other sports have even fewer options. Tournament organizers resort to spreadsheets and manual bracket management.

---

## 3. The Solution: The Performance Oracle

The Performance Oracle is the central intelligence layer, composed of three purpose-built engines:

### 3.1 The Scoring Engine (Cricket & Multi-Sport Oracle)

- **Role:** Captures real-world match data — runs, wickets, strike rate, goals, rally outcomes — from grassroots games. Cricket is the primary sport, optimized for ball-by-ball event ingestion, over tracking, and innings management.
- **Execution:** A NestJS-based backend "Trust Layer" that ingests scorer data and converts match highlights into Verifiable Data Points on Solana.
- **Data Flow:** `Scorer Device → NestJS API → PostgreSQL (event store) → Redis (real-time) → Solana (on-chain truth)`

### 3.2 The Calorie-Validation Engine (Effort Multiplier)

- **Role:** Uses wearable sensors to ensure "Skill" is backed by "Effort." Prevents fraudulent claims by requiring biometric proof of on-field activity.
- **Execution:** Apple HealthKit and Google Health Connect integration via NestJS microservices. Pulls heart rate and calorie data during the match window.
- **Validation:** Calorie data is time-windowed and cross-referenced with scoring events to produce an **Effort Score**.

### 3.3 The Deflationary Burn Engine (Solana Smart Contract)

- **Role:** Triggers a token burn based on the performance-to-effort ratio, creating a deflationary model tied to real athletic achievement.
- **Execution:** An Anchor (Rust) smart contract on Solana. Every finalized match triggers a burn event.
- **Reward Tiers:** Exceptional performances (e.g., "Nifty Fifty," "Gayle Storm," hat-tricks) increase the burn multiplier.

### End-to-End Pipeline

| Step | Description |
|------|-------------|
| 1. Score | Scorer captures ball-by-ball data via mobile interface |
| 2. Validate | NestJS applies sport rules, stores immutable events in PostgreSQL |
| 3. Verify Effort | Calorie-Validation Engine confirms biometric data from wearables |
| 4. Compute PoP | Performance-to-Effort ratio calculated; reward tier determined |
| 5. Burn & Reward | Solana smart contract executes token burn; player receives rewards |
| 6. On-Chain Truth | Finalized match data permanently anchored on Solana |

---

## 4. Technology Stack & Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js (TypeScript) | Server-side execution |
| Framework | NestJS | Modular backend with dependency injection |
| Primary Database | PostgreSQL | Primary ledger, append-only event store |
| Real-Time Layer | Redis | Caching, pub/sub, job queues, rate limiting |
| Blockchain | Solana | On-chain truth, token burns, verifiable data |
| Smart Contracts | Anchor (Rust) | Deflationary burn engine logic |
| Health Integration | Apple HealthKit / Google Health Connect | Calorie & biometric validation |

### 4.1 PoP Protocol Data Layers

- **Primary Ledger (PostgreSQL):** Append-only, immutable event store. Every record timestamped and sequenced for deterministic replay.
- **Real-Time Guard (Redis):** Live match state, WebSocket pub/sub per match, commentary job queues, rate limiting.
- **On-Chain Truth (Solana):** Finalized match outcomes as Verifiable Data Points. Token burns permanently anchored and publicly auditable.

### 4.2 System Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Mobile Client │────▶│  NestJS Gateway  │────▶│   PostgreSQL     │
│ (Scorer/Fan)  │◀────│  REST + WS       │     │  (Event Store)   │
└──────────────┘     └────────┬──────────┘     └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼─────┐     ┌───────▼───────┐
              │   Redis    │     │    Solana      │
              │ (Realtime) │     │ (On-Chain)     │
              └───────────┘     └───────────────┘
```

---

## 5. Cricket Scoring Engine (Primary Sport)

Cricket is the flagship sport. The Scoring Engine provides comprehensive ball-by-ball event capture, full rules enforcement, real-time analytics, automated commentary, and direct Solana burn integration.

### 5.1 Supported Formats

| Format | Overs/Innings | Players/Side | Powerplay | Use Case |
|--------|--------------|-------------|-----------|----------|
| Box Cricket | 5–10 overs | 6–8 | Optional | Grassroots, casual |
| T10 | 10 overs | 11 | 2 overs | Quick league |
| T20 | 20 overs | 11 | 6 overs | Tournament standard |
| ODI (50 Over) | 50 overs | 11 | 10 overs | Full-day match |
| Custom | Configurable | Configurable | Configurable | Flexible practice |

### 5.2 Ball-by-Ball Event Model

Every ball produces a **BallBowled** event — the atomic unit of cricket scoring:

- **Period:** innings number, over number, ball number
- **Actors:** batsman on strike, non-striker, bowler, fielder
- **Context:** total score, wickets, CRR, RRR, partnership
- **Payload:** runs (0–6), boundary/six flags, extras (wide/no-ball/bye/leg-bye), wicket details (10 types), shot type, free hit flag
- **Meta:** source device, offline sequence, latency

All events are append-only and immutable.

### 5.3 Scoring Rules Engine

**Run Scoring:** Valid runs: 0 (dot), 1, 2, 3, 4 (boundary), 6 (six), 5 (overthrows). Odd runs swap batsmen; even runs keep same striker.

**Extras:** Wide (+1, ball doesn't count), No-Ball (+1, ball doesn't count, next is Free Hit), Bye (extras), Leg Bye (extras), Penalty (5 runs).

**Over Management:** 6 legal deliveries per over. Max overs per bowler = total overs / 5. Powerplay tracking with fielding restrictions.

**Wickets:** 10 dismissal types supported. FOW (Fall of Wicket) tracked. Innings ends on all out, overs completed, or target chased.

**Innings Transitions:** Target = 1st innings total + 1. RRR computed for 2nd innings. Results: Win by runs/wickets, Tie, Super Over.

### 5.4 Cricket Analytics

**Batting:** Runs, balls, strike rate, 4s, 6s, dot %, average, partnerships, wagon wheel.

**Bowling:** Overs, runs, wickets, economy, average, maidens, best figures, strike rate.

**Fielding:** Catches, run-outs, stumpings.

**Visualizations:** Run rate graph, Manhattan chart, Worm chart, FOW timeline, powerplay analysis.

### 5.5 Commentary Triggers

| Trigger | Action |
|---------|--------|
| Boundary (4) | Auto-commentary on every boundary |
| Six | Auto-commentary on every six |
| Wicket | FOW details, dismissal type |
| Maiden Over | Tight bowling commentary |
| 50 Runs | Nifty Fifty token tier triggered |
| 100 Runs | Gayle Storm token tier triggered |
| 5-Wicket Haul | Token tier triggered |
| Hat-trick | Token tier triggered |
| Powerplay End | Summary with run rate |
| Innings End | Full summary with target |
| Match Won | Result with margin |

---

## 6. Multi-Sport Support

Beyond cricket, the platform supports 15+ sports:

**Individual:** Swimming, Wrestling, Boxing, Golf, Squash, Cycling, Shooting, Archery, Skating/Rollball.

**Paired:** Tennis, Table Tennis, Badminton, Pickleball.

**Team:** Football/Soccer, Basketball, Volleyball, Handball, Hockey, Box Cricket.

Each sport has a dedicated rules engine, UI configuration, and commentary templates within NestJS.

---

## 7. Tokenomics & Deflationary Model

### 7.1 Proof of Performance (PoP)

- **Performance Score:** From match events (runs, wickets, goals, wins)
- **Effort Score:** From wearable biometrics (calories, heart rate) during match
- **PoP Ratio:** Performance × Effort = final reward weight

Dual validation ensures rewards only for players who performed well AND were physically active.

### 7.2 Token Reward Tiers (Cricket)

| Tier | Trigger | Multiplier |
|------|---------|-----------|
| Nifty Fifty | 50+ runs | 1.5x |
| Gayle Storm | 100+ runs, SR > 150 | 3.0x |
| 5-Wicket Haul | 5+ wickets in innings | 2.5x |
| Hat-trick | 3 consecutive wickets | 3.0x |
| Maiden Master | 3+ maiden overs | 1.5x |
| Run Machine | 30+ runs in single over | 4.0x |
| Golden Arm | Economy < 4.0 over 4+ overs | 1.3x |
| All-Rounder | 30+ runs AND 2+ wickets | 2.0x |

### 7.3 Burn Mechanics

Every finalized match triggers a Solana smart contract burn. Higher PoP ratio = larger burn = larger reward. Continuous burns create sustained deflationary pressure, aligning incentives between athletic achievement and economic value.

---

## 8. Platform Modules

| # | Module | Key Capabilities |
|---|--------|-----------------|
| 1 | User Account & Profile | Registration, JWT auth, profile, onboarding |
| 2 | Sport Selection & Skill | Catalog API, skill tagging, AI evolution |
| 3 | Match & Tournament | Lifecycle, brackets (RR/KO/League), scheduling |
| 4 | Event Ingestion & Scoring | Append-only events, rules engines, offline sync |
| 5 | Community Discussion | Forums, threads, replies, moderation |
| 6 | Follow System & Feed | Social feed, AI-validated photo wall |
| 7 | E-Commerce | Products, checkout, Stripe/Razorpay |
| 8 | AI Performance Tracking | Stat cards, heatmaps, AI insights |
| 9 | Blockchain & Tokenomics | Solana burns, rewards, wallet management |
| 10 | Commentary Engine | NLG, pub/sub, persona toggles |
| 11 | Wearable Integration | HealthKit/Health Connect, Effort Score |

---

## 9. API & Data Contract

All endpoints prefixed `/api/v1/`:

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/social` |
| Users | `GET/PUT /users/me`, `GET /users/:id`, `GET /users/discover` |
| Sports | `GET /sports`, `GET /sports/:id/config` |
| Matches | `POST /matches`, `GET /matches/:id`, `POST /matches/:id/start\|pause\|end\|finalize` |
| Events | `POST /matches/:id/events`, `GET /matches/:id/events?from=` |
| WebSocket | `WS match:{id}` — scoreUpdate, commentary, highlight |
| Tournaments | `POST /tournaments`, `GET /tournaments/:id/standings` |
| Social | `POST /follows/:userId`, `GET /feed`, `POST /feed/posts` |
| Admin | `POST /admin/matches/:id/override`, `GET /admin/audit` |

---

## 10. User Experience

### Core Principles

- **One-Thumb Scoring:** Large tap targets for primary actions
- **Authoritative Scoreboard:** Always-visible score, overs, run rate
- **Immediate Feedback:** Haptic + animations on every event
- **Offline-First:** All events queued locally; sync on reconnect

### Cricket Scorer UI

Scoreband (total/wickets/overs/CRR/RRR) → Ball Entry (0–6, Wide, No-Ball, Bye, LB) → Wicket Panel → Over History → Commentary Ticker → Sync Footer

---

## 11. Security & Non-Functional Requirements

| Attribute | Target |
|-----------|--------|
| Latency | Median < 500 ms; p95 ≤ 1.5 s |
| Availability | 99.9% monthly uptime |
| Throughput | 1,000 concurrent matches × 20 events/min |
| Encryption | At rest + in transit (TLS) |
| Auth | JWT with device binding, RBAC |
| Immutability | Append-only event store |
| Offline | Local queue, deterministic ordering |
| Observability | E2E tracing, dashboards, alerting |

---

## 12. Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| 1 | Q1 2026 | Scaffolding, DB, auth, user onboarding |
| 2 | Q2 2026 | Cricket Scoring Engine, match lifecycle, WebSocket |
| 3 | Q3 2026 | Commentary engine, wearable integration |
| 4 | Q3 2026 | Solana smart contract, burn engine |
| 5 | Q4 2026 | Multi-sport scoring engines |
| 6 | Q4 2026 | Tournaments, social, forums, AI analytics |
| 7 | Q1 2027 | E-commerce, mobile polish |
| 8 | Q2 2027 | Public beta, security audit |

---

## 13. Conclusion

Sport Performance Protocol creates the world's first **Proof of Performance** layer for amateur athletes. Every ball bowled, every goal scored, every calorie burned becomes a verifiable, immutable, economically meaningful data point on the Solana blockchain.

The platform transforms grassroots sport from an invisible, unrecorded activity into a transparent, rewarded, and permanently recorded achievement.

---

*This whitepaper is for informational purposes only. It does not constitute financial advice, an offer of securities, or a solicitation of investment. Token mechanics are subject to change based on regulatory and technical considerations.*
