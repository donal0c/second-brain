# Testing Infrastructure

This directory contains test fixtures and LLM verification tests.

## Directory Structure

```
tests/
├── fixtures/               # Test data and seeding
│   ├── test-data.ts        # Sample data definitions
│   └── seed-database.ts    # Database seeding script
└── verification/           # LLM verification tests
    ├── prompts/            # Verification prompt templates
    │   ├── inbox-processing.md
    │   ├── context-learning.md
    │   └── search-quality.md
    ├── report-schema.ts    # Report type definitions
    └── run-verification.ts # Verification runner
```

**Note:** E2E tests are in `packages/e2e/tests/`.

## Database Seeding

Seed the database with test data:

```bash
# Clear all data
pnpm test:seed

# Load busy user scenario
pnpm test:seed:busy

# With custom database URL
TEST_DATABASE_URL=postgresql://... pnpm test:seed:busy
```

## LLM Verification Tests

Run LLM-based verification tests (requires ANTHROPIC_API_KEY):

```bash
# Run all verification suites
pnpm test:verify

# Run specific suite
npx tsx tests/verification/run-verification.ts inbox

# Available suites: inbox, context, search
```
