# Second Brain

> A local-first cognitive architecture that captures, processes, and surfaces what matters.

## What is this?

Second Brain is not a traditional knowledge management app—it's an **external cognitive architecture** that works like an assistant-powered factory:

- **You capture** raw thoughts, tasks, and facts into one universal inbox
- **The system classifies and extracts** structured memory and next actions using AI
- **The system proactively surfaces** what matters through daily/weekly nudges

The goal: eliminate cognitive leakage and the constant mental overhead of trying not to forget.

## Why build this?

Most productivity systems fail because they require effort at the worst moments (when you're rushed or tired). Second Brain is designed as **support rails** that work even when you're disorganized.

**Core philosophy:**
- Humans excel at thinking and decision-making, not storage and retrieval
- The system offloads storage/retrieval and returns only what you need, when you need it
- One reliable behavior (capture) + automation for everything else
- Design for restart, not perfection—missing a week shouldn't create guilt or backlog monsters

## Current Status

**Phase 1 (MVP) - Complete** ✓

The system implements the core closed loop:

```
Capture → Process → File (or Clarify) → Digest → Fix
```

### Implemented Features

- **Universal Capture**: Frictionless text input with < 5 second capture time
- **AI Classification**: Automatic routing to Task, Project, Idea, Person, or Clarification
- **Structured Extraction**: Next actions, due dates, relationship context, and more
- **Confidence Gating**: Low-confidence items are held for clarification instead of being filed incorrectly
- **Daily Digest**: Actionable summary of what matters today
- **Receipts System**: Full audit trail of every AI decision
- **Personal Context Learning**: System learns your world (people, places, organizations) from captures
- **Hybrid Editing**: Natural language editing with auto-processing
- **Browse View**: Explore all stored entities (tasks, projects, ideas, people)

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Web UI (React + Vite + Tailwind)             │
│  • Capture • Inbox • Today • Clarifications    │
│  • Browse • Receipts                            │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  API Server (Fastify + TypeScript)             │
│  • REST endpoints • Error handling              │
│  • Background jobs • LLM integration            │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  Processing Pipeline                            │
│  • Classification • Field extraction            │
│  • Confidence gating • Receipt generation       │
│  • Personal context injection                   │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  PostgreSQL Database (Drizzle ORM)             │
│  • Tasks • Projects • Ideas • Persons           │
│  • Receipts • Clarifications • Personal Context │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend**: Fastify (TypeScript)
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic Claude API
- **Package Manager**: pnpm (monorepo with workspaces)
- **Runtime**: Node.js ≥20.0.0

### Monorepo Structure

```
packages/
├── api/        # Fastify server, routes, processing pipeline
├── web/        # React frontend
├── config/     # Shared configuration (LLM, environment)
└── shared/     # Shared types and schemas
```

## Getting Started

### Prerequisites

- Node.js ≥20.0.0
- pnpm ≥9.15.0
- PostgreSQL ≥14.0
- Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd second_brain
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create a database (using psql or your preferred method)
   createdb second_brain
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration (see [Environment Variables](#environment-variables) for details):
   ```
   DATABASE_URL=postgresql://localhost:5432/second_brain
   ANTHROPIC_API_KEY=your_key_here
   ```

5. **Initialize the database**
   ```bash
   pnpm --filter @second-brain/api db:migrate
   ```

### Running the Application

**Development mode** (runs both API and web concurrently):
```bash
pnpm dev
```

This starts:
- API server on `http://localhost:3000`
- Web UI on `http://localhost:5173`

**Run services separately:**
```bash
# API only
pnpm dev:api

# Web only
pnpm dev:web
```

### Building for Production

```bash
pnpm build
```

## Usage

### 1. Capture

Open the web UI and use the capture box. Type anything:
- "Call mom about dinner next Friday"
- "Project idea: build a better RSS reader"
- "Met Sarah at the conference, works on climate tech"
- "Read the Rust book"

### 2. Process

The system automatically processes items within minutes:
- Classifies the type (task, project, person, idea)
- Extracts structured fields (next action, due date, context)
- Files into memory or creates a clarification if uncertain

### 3. Review

- **Today**: See your daily digest with relevant next actions
- **Inbox**: Monitor processing status
- **Clarifications**: Answer questions about uncertain items
- **Browse**: Explore all stored entities
- **Receipts**: Audit what the AI did and why

### 4. Fix

Found an error? Use natural language editing:
- "Change the due date to next Tuesday"
- "This task is actually a project"
- "Mark this as completed"

The system processes corrections and generates new receipts.

## Database Management

```bash
# Generate migrations after schema changes
pnpm --filter @second-brain/api db:generate

# Apply migrations
pnpm --filter @second-brain/api db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @second-brain/api db:studio
```

## Development Commands

```bash
# Lint code
pnpm lint
pnpm lint:fix

# Format code
pnpm format
pnpm format:check

# Type checking
pnpm typecheck
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://localhost:5432/second_brain` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key for Claude |
| `PORT` | No | `3001` | API server port |
| `HOST` | No | `0.0.0.0` | API server host binding |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for web UI |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |
| `NODE_ENV` | No | `development` | Environment mode (development, production) |
| `API_AUTH_TOKEN` | No | - | Bearer token for API authentication (production) |
| `VITE_API_URL` | No | `http://localhost:3001` | API URL for the web frontend |

## Troubleshooting

### Database Connection Issues

**Error: `connection refused` or `ECONNREFUSED`**
- Ensure PostgreSQL is running: `pg_isready` or `brew services list` (macOS)
- Verify the database exists: `psql -l | grep second_brain`
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`

**Error: `relation does not exist`**
- Run migrations: `pnpm --filter @second-brain/api db:migrate`

### API Issues

**Error: `ANTHROPIC_API_KEY is not set`**
- Ensure `.env` file exists in project root
- Verify the API key is set: `grep ANTHROPIC_API_KEY .env`

**Error: CORS blocked**
- Check `CORS_ORIGIN` matches your frontend URL
- For local development, use `http://localhost:5173`

### Port Conflicts

**Error: `EADDRINUSE: address already in use`**
- Another process is using the port
- Find it: `lsof -i :3001` (API) or `lsof -i :5173` (Web)
- Kill the process or change the port in `.env`

### Build Issues

**Error: TypeScript errors during build**
- Run type check: `pnpm typecheck`
- Ensure all packages are built: `pnpm build`

**Error: Module not found**
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Rebuild: `pnpm build`

## Schema Overview

### Core Entities

**InboxItem**
- Universal capture point
- Status: new → processing → processed/blocked

**Task**
- Title, next action, due date, context
- Status: active, completed, waiting, someday

**Project**
- Name, desired outcome, next action
- Status: active, completed, on_hold, someday

**Person**
- Name, relationship context, follow-up actions
- Tracks last touched date

**Idea**
- Title, summary, related links

### System Entities

**Receipt** (Audit Trail)
- Classification decision
- Extracted fields
- Confidence score
- Model used and timestamp
- List of writes (created/updated entities)
- Personal context used in processing

**Clarification**
- Question for user
- Optional answer choices
- User answer and resolution timestamp

**PersonalContext** (Learning System)
- Entities from your world (people, places, organizations, concepts)
- Domain categorization (work, family, health, etc.)
- Mention tracking
- Used to inject context into AI processing

## Design Principles

1. **One reliable behavior: Capture**
   Everything else is automation

2. **Separation of concerns**
   Memory (PostgreSQL) vs Compute (AI) vs Interface (Web UI)

3. **Next Action is the unit of execution**
   Extract specific steps, not vague intentions

4. **Reliability over cleverness**
   Small schemas, few categories, strict confidence gating

5. **Maintainability first**
   Boring tech, clear patterns, full audit trail

## Roadmap

### Phase 2: Trust + Repair (Next)
- ✓ Receipt viewer (implemented)
- Enhanced fix flow with receipt chaining
- Sub-15-second correction UX

### Phase 3: Proactive Retrieval
- Weekly review digest
- Nudge engine (stale projects, people follow-ups)
- Smart surfacing of relevant context

### Phase 4: Multi-device
- PWA for mobile
- Offline capture queue
- Sync layer (self-hosted API + Postgres)
- Passkey authentication

### Phase 5: Ultra-low Friction
- Global hotkey capture (desktop)
- iOS/Android shortcuts
- Voice capture + transcription
- Watch integration

## Contributing

This is a personal cognitive architecture project. The code is open for reference and learning, but contributions are not currently accepted.

## License

Private use only.

---

**Built with**: TypeScript, React, Fastify, PostgreSQL, Drizzle ORM, Anthropic Claude API
