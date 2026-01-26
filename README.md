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

**Phase 1-3 Complete** ✓

The system implements the full closed loop with proactive retrieval:

```
Capture → Process → File (or Clarify) → Digest → Nudge → Fix
```

### Implemented Features

#### Core Pipeline
- **Universal Capture**: Frictionless text input with < 5 second capture time
- **AI Classification**: Automatic routing to Task, Project, Idea, Person, or Clarification
- **Structured Extraction**: Next actions, due dates, relationship context, and more
- **Confidence Gating**: Low-confidence items are held for clarification instead of being filed incorrectly
- **Deja Capture**: Semantic duplicate detection prevents re-capturing similar information
- **Circuit Breaker**: After 3 failed clarification attempts, items are force-filed with best-effort extraction

#### Search & Discovery
- **Keyword Search**: Full-text search across all entity fields
- **Semantic Search**: Vector similarity search using OpenAI embeddings
- **Hybrid Search**: Combines keyword + semantic with Reciprocal Rank Fusion (RRF)
- **Similarity Search**: Find entities similar to any existing entity or arbitrary text
- **Result Snippets**: Highlighted matches in search results

#### Digests & Nudges
- **Daily Digest**: Actionable summary with top tasks, flagged items, clarifications, stale tasks
- **Weekly Digest**: Open loops, stale projects, context learning questions, wins, focus areas
- **Nudge System**: Contextual micro-prompts for due tasks, stale items, follow-ups, missing next actions
- **Snooze & Dismiss**: Control nudge visibility with snooze (1-168 hours) or dismiss

#### Learning & Context
- **Personal Context Learning**: System learns your world (people, places, organizations) from captures
- **Context Injection**: Learned entities improve AI extraction accuracy
- **Undescribed Context Questions**: Prompts to describe frequently-mentioned entities

#### Trust & Repair
- **Receipts System**: Full audit trail of every AI decision
- **Natural Language Editing**: Fix entities with plain English instructions
- **Reprocessing**: Reset and reprocess any inbox item
- **Review Queue**: Surface items that need manual validation

#### Browse & Explore
- **Browse View**: Explore all stored entities (tasks, projects, ideas, people)
- **Entity Relationships**: Find similar items via vector embeddings

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Web UI (React + Vite + Tailwind)               │
│  • Capture • Inbox • Today • Clarifications     │
│  • Browse • Receipts • Search                   │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  API Server (Fastify + TypeScript)              │
│  • REST endpoints • Error handling              │
│  • Background jobs • LLM integration            │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  Processing Pipeline                            │
│  • Classification • Field extraction            │
│  • Confidence gating • Receipt generation       │
│  • Personal context injection • Embeddings      │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  PostgreSQL + pgvector                          │
│  • Tasks • Projects • Ideas • Persons           │
│  • Receipts • Clarifications • Personal Context │
│  • Nudges • Vector embeddings (1536 dim)        │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend**: Fastify (TypeScript)
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL + Drizzle ORM + pgvector
- **AI Classification**: Anthropic Claude API (claude-sonnet-4.5, configurable via SECOND_BRAIN_LLM_MODEL)
- **AI Embeddings**: OpenAI API (text-embedding-3-small, 1536 dimensions)
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
- PostgreSQL ≥14.0 with pgvector extension
- Anthropic API key (required for classification/extraction)
- OpenAI API key (optional, enables semantic search & similarity)

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
   # Create a database
   createdb second_brain

   # Enable pgvector extension (connect to database first)
   psql second_brain -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration (see [Environment Variables](#environment-variables)):
   ```
   DATABASE_URL=postgresql://localhost:5432/second_brain
   ANTHROPIC_API_KEY=your_anthropic_key_here
   OPENAI_API_KEY=your_openai_key_here  # Optional: enables semantic search
   ```

5. **Initialize the database**
   ```bash
   pnpm --filter @second-brain/api db:migrate
   ```

6. **Backfill embeddings** (if you have existing data)
   ```bash
   pnpm --filter @second-brain/api backfill:embeddings
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
- Detects similar existing items (Deja Capture)
- Files into memory or creates a clarification if uncertain
- Generates embeddings for semantic search

### 3. Review

- **Today**: See your daily digest with relevant next actions and nudges
- **Inbox**: Monitor processing status
- **Clarifications**: Answer questions about uncertain items
- **Browse**: Explore all stored entities
- **Receipts**: Audit what the AI did and why
- **Search**: Find anything with keyword, semantic, or hybrid search

### 4. Fix

Found an error? Use natural language editing:
- "Change the due date to next Tuesday"
- "This task is actually a project"
- "Mark this as completed"

The system processes corrections and generates new receipts.

## API Endpoints

### Inbox
- `POST /inbox` - Capture new item (auto-processes)
- `GET /inbox` - List items (paginated, filterable)
- `POST /inbox/:id/reprocess` - Reset and reprocess item

### Processing
- `POST /process/:id` - Process single item
- `POST /process/batch` - Process multiple pending items
- `GET /process/status` - Check if processing available

### Entities (tasks, projects, ideas, persons)
- `GET /:type` - List entities (paginated, filtered)
- `POST /:type` - Create entity
- `GET /:type/:id` - Get single entity
- `PATCH /:type/:id` - Update entity
- `DELETE /:type/:id` - Delete entity
- `POST /:type/:id/interpret` - Natural language edit

### Search
- `GET /search?q=query&mode=keyword|semantic|hybrid` - Search across all entities
- `GET /:type/:id/similar` - Find similar entities
- `POST /similar` - Find entities similar to text

### Digests
- `GET /digest/daily` - Today's actionable summary
- `GET /digest/weekly` - Weekly review
- `GET /digest/summary` - Quick stats

### Nudges
- `GET /nudges` - Get active nudges (max 2/day)
- `POST /nudges/:id/dismiss` - Dismiss a nudge
- `POST /nudges/:id/snooze` - Snooze for N hours

### Context
- `GET /context` - List learned entities
- `GET /context/questions` - Get context clarification questions
- `PATCH /context/:id` - Update entity description

### Clarifications
- `GET /clarifications` - List pending/resolved questions
- `POST /clarifications/:id/resolve` - Answer and reprocess

### Receipts
- `GET /receipts` - Audit trail (filterable)
- `GET /receipts/:id` - Get receipt details

## Database Management

```bash
# Generate migrations after schema changes
pnpm --filter @second-brain/api db:generate

# Apply migrations
pnpm --filter @second-brain/api db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @second-brain/api db:studio

# Backfill embeddings for existing entities
pnpm --filter @second-brain/api backfill:embeddings
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

# Run unit tests
pnpm --filter @second-brain/api test

# Run integration tests (requires database)
DATABASE_URL=postgresql://localhost:5432/second_brain \
  pnpm --filter @second-brain/api test:integration
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://localhost:5432/second_brain` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic API key for Claude (classification/extraction) |
| `OPENAI_API_KEY` | No | - | OpenAI API key (enables semantic search & similarity) |
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

**Error: `type "vector" does not exist`**
- Install pgvector extension: `psql second_brain -c "CREATE EXTENSION vector;"`

### API Issues

**Error: `ANTHROPIC_API_KEY is not set`**
- Ensure `.env` file exists in project root
- Verify the API key is set: `grep ANTHROPIC_API_KEY .env`

**Error: CORS blocked**
- Check `CORS_ORIGIN` matches your frontend URL
- For local development, use `http://localhost:5173`

**Semantic search returns empty results**
- Check if `OPENAI_API_KEY` is set
- Ensure entities have embeddings: run `pnpm --filter @second-brain/api backfill:embeddings`

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
- Status: new → processing → processed/blocked/error
- Tracks clarification attempts

**Task**
- Title, next action, due date, context
- Status: active, completed, waiting, someday
- Vector embedding for similarity

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
- Classification decision and confidence score
- Extracted fields
- Model used and timestamp
- List of writes (created/updated entities)
- Personal context used in processing
- Context extraction status

**Clarification**
- Question for user
- Optional answer choices
- User answer and resolution timestamp

**PersonalContext** (Learning System)
- Entities from your world (people, places, organizations, concepts)
- Domain categorization (work, family, health, etc.)
- Mention tracking and frequency
- Vector embedding for similarity

**Nudge**
- Type: task_due_soon, task_stale, project_missing_next_action, person_follow_up
- Message and target entity
- Dismissed/snoozed status

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

### Phase 4: Multi-device (Next)
- PWA for mobile
- Offline capture queue
- Sync layer (self-hosted API + Postgres)
- Passkey authentication

### Phase 5: Ultra-low Friction
- Global hotkey capture (desktop)
- iOS/Android shortcuts
- Voice capture + transcription
- Watch integration

### Phase 6: Electron Desktop App
- Native desktop application
- System tray integration
- Global capture hotkey

## Contributing

This is a personal cognitive architecture project. The code is open for reference and learning, but contributions are not currently accepted.

## License

Private use only.

---

**Built with**: TypeScript, React, Fastify, PostgreSQL, Drizzle ORM, pgvector, Anthropic Claude API, OpenAI Embeddings
