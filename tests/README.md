# Second Brain Testing Infrastructure

This directory contains the testing infrastructure for Second Brain, including E2E tests with Playwright and LLM verification tests.

## Directory Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── utils/              # Test utilities and helpers
│   │   └── test-helpers.ts # Navigation, API, assertion helpers
│   ├── smoke.spec.ts       # Basic smoke tests
│   ├── capture.spec.ts     # Capture flow tests
│   ├── reports/            # HTML test reports (gitignored)
│   └── results/            # Test artifacts (gitignored)
├── fixtures/               # Test data and seeding
│   ├── test-data.ts        # Sample data definitions
│   └── seed-database.ts    # Database seeding script
└── verification/           # LLM verification tests
    ├── prompts/            # Verification prompt templates
    │   ├── inbox-processing.md
    │   ├── context-learning.md
    │   └── search-quality.md
    ├── report-schema.ts    # Report type definitions
    ├── run-verification.ts # Verification runner
    └── reports/            # Generated reports (gitignored)
```

## Quick Start

### Prerequisites

1. Install Playwright browsers:
   ```bash
   cd packages/web
   npx playwright install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running E2E Tests

From the project root:

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run with browser visible
pnpm test:e2e:headed

# Run specific test file
pnpm --filter @second-brain/web exec playwright test tests/e2e/capture.spec.ts
```

From the web package:

```bash
cd packages/web
pnpm test
pnpm test:ui
pnpm test:debug
```

### Database Seeding

Seed the database with test data:

```bash
# Clear all data
pnpm test:seed

# Load busy user scenario
pnpm test:seed:busy

# With custom database URL
TEST_DATABASE_URL=postgresql://... pnpm test:seed:busy
```

### LLM Verification Tests

Run LLM-based verification tests:

```bash
# Run all verification suites
ANTHROPIC_API_KEY=... pnpm test:verify

# Run specific suite
ANTHROPIC_API_KEY=... npx tsx tests/verification/run-verification.ts inbox

# Available suites: inbox, context, search
```

## Writing Tests

### E2E Tests

Tests use Playwright with TypeScript. Import helpers from `utils/test-helpers.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { navigateTo, captureThought } from "./utils/test-helpers";

test("can capture a thought", async ({ page }) => {
  await navigateTo(page, "capture");
  await captureThought(page, "Test capture");
  // assertions...
});
```

### Test Data Fixtures

Use predefined test data from `fixtures/test-data.ts`:

```typescript
import { testTasks, busyUserScenario } from "../fixtures/test-data";

// Use individual items
const task = testTasks.active;

// Use complete scenarios
await seedScenario(busyUserScenario);
```

### Verification Prompts

Add new verification prompt templates in `verification/prompts/`:

1. Create a markdown file with test cases and expected outcomes
2. Define the JSON response format
3. Add the suite to `run-verification.ts`

## Configuration

### Playwright Config

See `packages/web/playwright.config.ts` for:
- Test directory settings
- Browser configurations
- Web server startup
- Reporter settings

### Test Database

For isolated tests, use a separate test database:

```bash
# Create test database
createdb second_brain_test

# Run migrations
DATABASE_URL=postgresql://localhost:5432/second_brain_test pnpm --filter @second-brain/api db:migrate

# Use in tests
TEST_DATABASE_URL=postgresql://localhost:5432/second_brain_test pnpm test:seed:busy
```

## CI Integration

For CI environments, Playwright is configured to:
- Run tests in headless mode
- Retry failed tests twice
- Generate HTML reports
- Capture screenshots/videos on failure

Example GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: cd packages/web && npx playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CI: true
```

## Troubleshooting

### Tests fail to start

Ensure the dev servers can start:
```bash
pnpm dev  # Should start both API and web
```

### Database connection errors

Check your DATABASE_URL environment variable and ensure PostgreSQL is running.

### Playwright browser issues

Reinstall browsers:
```bash
cd packages/web
npx playwright install --force
```

### Verification tests fail

Ensure ANTHROPIC_API_KEY is set and has sufficient credits.
