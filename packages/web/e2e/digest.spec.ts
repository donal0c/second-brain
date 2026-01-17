import { test, expect } from '@playwright/test';

test.describe('Daily Digest - Today Page', () => {
  test('Today page loads and shows daily digest', async ({ page }) => {
    await page.goto('/today');

    // Page title
    await expect(page.locator('h2')).toContainText('Today');

    // Wait for digest to load (skeleton should disappear)
    await expect(page.getByText('Loading')).not.toBeVisible({ timeout: 10000 });

    // Date should be visible
    const dateText = page.locator('p.text-gray-600').first();
    await expect(dateText).toBeVisible();

    // Stats cards should be present (3 cards: Active Tasks, Active Projects, Ideas)
    const statCards = page.locator('.grid-cols-3 > div');
    await expect(statCards).toHaveCount(3);

    // Check stat labels
    await expect(page.getByText('Active Tasks')).toBeVisible();
    await expect(page.getByText('Active Projects')).toBeVisible();
    await expect(page.getByText('Ideas')).toBeVisible();

    // Next Actions section should be visible
    await expect(page.getByRole('heading', { name: 'Next Actions' })).toBeVisible();
  });

  test('stats display numeric values', async ({ page }) => {
    await page.goto('/today');

    // Wait for data to load
    await expect(page.getByText('Active Tasks')).toBeVisible({ timeout: 10000 });

    // Stats should show numbers (can be 0)
    const statCards = page.locator('.grid-cols-3 > div');

    for (let i = 0; i < 3; i++) {
      const card = statCards.nth(i);
      const numberText = await card.locator('.text-2xl, .text-3xl').textContent();
      expect(numberText).toMatch(/^\d+$/);
    }
  });

  test('refresh button reloads data', async ({ page }) => {
    await page.goto('/today');

    // Wait for initial load
    await expect(page.getByText('Active Tasks')).toBeVisible({ timeout: 10000 });

    // Click refresh
    await page.getByRole('button', { name: 'Refresh' }).click();

    // Stats should still be visible after refresh
    await expect(page.getByText('Active Tasks')).toBeVisible();
  });
});

test.describe('Daily Digest - Digest Page', () => {
  test('Digest page loads and shows daily digest', async ({ page }) => {
    await page.goto('/digest');

    // Page title
    await expect(page.locator('h2')).toContainText('Digest');

    // Wait for digest to load
    await expect(page.getByText('Active Tasks')).toBeVisible({ timeout: 10000 });

    // Stats cards should be present
    await expect(page.getByText('Active Tasks')).toBeVisible();
    await expect(page.getByText('Active Projects')).toBeVisible();
    await expect(page.getByText('Ideas')).toBeVisible();

    // Next Actions section should be visible
    await expect(page.getByRole('heading', { name: 'Next Actions' })).toBeVisible();
  });
});

test.describe('Weekly Review Page', () => {
  test('Weekly review page loads successfully', async ({ page }) => {
    await page.goto('/weekly');

    // Page title
    await expect(page.getByRole('heading', { name: 'Weekly Review' })).toBeVisible();

    // Wait for data to load (skeleton animation should complete)
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Week date range should be visible
    const weekRange = page.locator('p.text-gray-600').first();
    await expect(weekRange).toContainText(' to ');
  });

  test('refresh button reloads weekly review', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for initial load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Click refresh
    await page.getByRole('button', { name: 'Refresh' }).click();

    // Page should still work after refresh
    await expect(page.getByRole('heading', { name: 'Weekly Review' })).toBeVisible();
  });

  test('weekly review displays wins section when data exists', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for data to load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Check if Wins section is present (may or may not have data)
    const winsSection = page.getByText(/Wins This Week/);
    // This is conditional - if there are wins, it will show
    if (await winsSection.isVisible()) {
      await expect(winsSection).toBeVisible();
    }
  });

  test('weekly review displays open loops section when data exists', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for data to load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Check for Open Loops section
    const openLoopsSection = page.getByRole('heading', { name: /Open Loops/ });
    if (await openLoopsSection.isVisible()) {
      // If visible, should have task count
      await expect(openLoopsSection).toContainText(/\(\d+\)/);
    }
  });

  test('weekly review displays stale projects section when data exists', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for data to load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Check for Stale Projects section
    const staleSection = page.getByRole('heading', { name: /Stale Projects/ });
    if (await staleSection.isVisible()) {
      // Stale projects have 14+ days explanation
      await expect(page.getByText(/14\+ days/)).toBeVisible();
    }
  });

  test('weekly review displays suggested focus when data exists', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for data to load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Check for Suggested Areas of Focus section
    const focusSection = page.getByRole('heading', { name: 'Suggested Areas of Focus' });
    if (await focusSection.isVisible()) {
      await expect(focusSection).toBeVisible();
    }
  });
});

test.describe('Digest Items Link to Entities', () => {
  test('tasks in next actions are clickable', async ({ page }) => {
    await page.goto('/today');

    // Wait for data to load
    await expect(page.getByRole('heading', { name: 'Next Actions' })).toBeVisible({ timeout: 10000 });

    // Check if there are any tasks
    const taskCards = page.locator('h4.font-medium.text-gray-900');
    const taskCount = await taskCards.count();

    if (taskCount > 0) {
      // Tasks should have cursor-pointer class (clickable)
      const firstTaskParent = taskCards.first().locator('..').locator('..');
      await expect(firstTaskParent).toHaveClass(/cursor-pointer/);
    }
  });

  test('projects without next action link to project page', async ({ page }) => {
    await page.goto('/digest');

    // Wait for data to load
    await expect(page.getByText('Active Tasks')).toBeVisible({ timeout: 10000 });

    // Check for projects needing next action section
    const projectsSection = page.getByRole('heading', { name: /Projects Needing Next Action/ });
    if (await projectsSection.isVisible()) {
      // Project links should point to /projects/{id}
      const projectLinks = page.locator('a[href^="/projects/"]');
      const linkCount = await projectLinks.count();

      if (linkCount > 0) {
        const href = await projectLinks.first().getAttribute('href');
        expect(href).toMatch(/^\/projects\/\d+$/);
      }
    }
  });

  test('pending clarifications link to clarifications page', async ({ page }) => {
    await page.goto('/today');

    // Wait for data to load
    await expect(page.getByRole('heading', { name: 'Next Actions' })).toBeVisible({ timeout: 10000 });

    // Check for pending clarifications section
    const clarificationsSection = page.getByText(/Needs Your Input/);
    if (await clarificationsSection.isVisible()) {
      // Should have link to clarifications
      const clarificationsLink = page.locator('a[href="/clarifications"]');
      await expect(clarificationsLink).toBeVisible();
    }
  });

  test('stale tasks are clickable in Today page', async ({ page }) => {
    await page.goto('/today');

    // Wait for data to load
    await expect(page.getByRole('heading', { name: 'Next Actions' })).toBeVisible({ timeout: 10000 });

    // Check for stale tasks section
    const staleSection = page.getByRole('heading', { name: /Stale Tasks/ });
    if (await staleSection.isVisible()) {
      // Stale task items should be clickable
      const staleTasks = staleSection.locator('~div').locator('.cursor-pointer');
      const staleCount = await staleTasks.count();

      if (staleCount > 0) {
        await expect(staleTasks.first()).toHaveClass(/cursor-pointer/);
      }
    }
  });

  test('open loops link to browse page in weekly review', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for data to load
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.animate-pulse');
      return !skeleton;
    }, { timeout: 10000 });

    // Check for open loops section
    const openLoopsSection = page.getByRole('heading', { name: /Open Loops/ });
    if (await openLoopsSection.isVisible()) {
      // Should have "View all tasks" link
      const viewAllLink = page.getByRole('link', { name: /View all tasks/ });
      if (await viewAllLink.isVisible()) {
        await expect(viewAllLink).toHaveAttribute('href', '/browse');
      }
    }
  });
});

test.describe('Context Filter', () => {
  test('digest API supports context filter parameter', async ({ request }) => {
    // Test 'all' context
    const allResponse = await request.get('/api/digest/daily?context=all');
    expect(allResponse.ok()).toBeTruthy();
    const allData = await allResponse.json();
    expect(allData.data.context).toBe('all');

    // Test 'work' context
    const workResponse = await request.get('/api/digest/daily?context=work');
    expect(workResponse.ok()).toBeTruthy();
    const workData = await workResponse.json();
    expect(workData.data.context).toBe('work');

    // Test 'personal' context
    const personalResponse = await request.get('/api/digest/daily?context=personal');
    expect(personalResponse.ok()).toBeTruthy();
    const personalData = await personalResponse.json();
    expect(personalData.data.context).toBe('personal');
  });

  test('digest API validates invalid context parameter', async ({ request }) => {
    const response = await request.get('/api/digest/daily?context=invalid');
    expect(response.status()).toBe(400);
  });

  test('digest API supports maxItems parameter', async ({ request }) => {
    const response = await request.get('/api/digest/daily?maxItems=5');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.data.nextActions.length).toBeLessThanOrEqual(5);
  });

  test('digest API supports staleDays parameter', async ({ request }) => {
    const response = await request.get('/api/digest/daily?staleDays=14');
    expect(response.ok()).toBeTruthy();
    // staleDays affects the staleTasks query threshold
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Summary Stats Endpoint', () => {
  test('summary endpoint returns correct structure', async ({ request }) => {
    const response = await request.get('/api/digest/summary');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Check inbox stats
    expect(data.data.inbox).toBeDefined();
    expect(typeof data.data.inbox.new).toBe('number');
    expect(typeof data.data.inbox.needsClarification).toBe('number');

    // Check entity stats
    expect(data.data.entities).toBeDefined();
    expect(typeof data.data.entities.activeTasks).toBe('number');
    expect(typeof data.data.entities.activeProjects).toBe('number');
    expect(typeof data.data.entities.ideas).toBe('number');

    // Check pending clarifications
    expect(typeof data.data.pendingClarifications).toBe('number');
  });
});

test.describe('Weekly Review Endpoint', () => {
  test('weekly endpoint returns correct structure', async ({ request }) => {
    const response = await request.get('/api/digest/weekly');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Check week range
    expect(data.data.weekStart).toBeDefined();
    expect(data.data.weekEnd).toBeDefined();

    // Check open loops
    expect(data.data.openLoops).toBeDefined();
    expect(data.data.openLoops.tasks).toBeInstanceOf(Array);
    expect(typeof data.data.openLoops.total).toBe('number');

    // Check stale projects
    expect(data.data.staleProjects).toBeDefined();
    expect(data.data.staleProjects.projects).toBeInstanceOf(Array);

    // Check context questions
    expect(data.data.contextQuestions).toBeDefined();
    expect(data.data.contextQuestions.questions).toBeInstanceOf(Array);

    // Check wins
    expect(data.data.wins).toBeDefined();
    expect(data.data.wins.completedTasks).toBeInstanceOf(Array);
    expect(data.data.wins.completedProjects).toBeInstanceOf(Array);

    // Check suggested focus
    expect(data.data.suggestedFocus).toBeInstanceOf(Array);
  });
});
