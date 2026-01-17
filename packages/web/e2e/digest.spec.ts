import { test, expect } from '@playwright/test';

test.describe('Today page', () => {
  test('Today page loads and shows daily digest', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete - use heading which is unique
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();

    // Verify stats grid is present
    await expect(page.getByTestId('stats-grid')).toBeVisible();
  });

  test('stats display numeric values', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();

    // Use data-testid for stat values to avoid ambiguous text matching
    const activeTasksValue = page.getByTestId('stat-active-tasks-value');
    const activeProjectsValue = page.getByTestId('stat-active-projects-value');
    const ideasValue = page.getByTestId('stat-ideas-value');

    await expect(activeTasksValue).toBeVisible();
    await expect(activeProjectsValue).toBeVisible();
    await expect(ideasValue).toBeVisible();

    // Verify stat labels using testids to avoid matching empty state text
    await expect(page.getByTestId('stat-active-tasks-label')).toHaveText('Active Tasks');
    await expect(page.getByTestId('stat-active-projects-label')).toHaveText('Active Projects');
    await expect(page.getByTestId('stat-ideas-label')).toHaveText('Ideas');
  });

  test('refresh button reloads data', async ({ page }) => {
    await page.goto('/');

    // Wait for initial load
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByTestId('stats-grid')).toBeVisible();

    // Use data-testid for refresh button to avoid ambiguity
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Verify page still shows content after refresh
    await expect(page.getByTestId('stats-grid')).toBeVisible();
  });
});

test.describe('Digest page', () => {
  test('Digest page loads and shows daily digest', async ({ page }) => {
    await page.goto('/digest');

    // Wait for loading to complete - use exact heading match
    await expect(page.getByRole('heading', { name: 'Digest', exact: true })).toBeVisible();

    // Verify stats grid is present
    await expect(page.getByTestId('stats-grid')).toBeVisible();
  });

  test('stats display with proper labels', async ({ page }) => {
    await page.goto('/digest');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Digest', exact: true })).toBeVisible();

    // Use data-testid for stat containers to avoid ambiguous locators
    await expect(page.getByTestId('stat-active-tasks')).toBeVisible();
    await expect(page.getByTestId('stat-active-projects')).toBeVisible();
    await expect(page.getByTestId('stat-ideas')).toBeVisible();

    // Verify labels use exact text match
    await expect(page.getByTestId('stat-active-tasks-label')).toHaveText('Active Tasks');
    await expect(page.getByTestId('stat-active-projects-label')).toHaveText('Active Projects');
    await expect(page.getByTestId('stat-ideas-label')).toHaveText('Ideas');
  });

  test('refresh button reloads digest data', async ({ page }) => {
    await page.goto('/digest');

    // Wait for initial load
    await expect(page.getByRole('heading', { name: 'Digest', exact: true })).toBeVisible();

    // Use testid for refresh button
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Verify stats still visible after refresh
    await expect(page.getByTestId('stats-grid')).toBeVisible();
  });
});

test.describe('Weekly review page', () => {
  test('Weekly review page loads successfully', async ({ page }) => {
    await page.goto('/weekly');

    // Use exact heading match
    await expect(page.getByRole('heading', { name: 'Weekly Review', exact: true })).toBeVisible();
  });

  test('refresh button reloads weekly review', async ({ page }) => {
    await page.goto('/weekly');

    // Wait for initial load
    await expect(page.getByRole('heading', { name: 'Weekly Review', exact: true })).toBeVisible();

    // Use testid for refresh button
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Page should still show heading after refresh
    await expect(page.getByRole('heading', { name: 'Weekly Review', exact: true })).toBeVisible();
  });
});

test.describe('Projects without next action', () => {
  test('projects without next action link to project page', async ({ page }) => {
    await page.goto('/digest');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Digest', exact: true })).toBeVisible();

    // Check for projects needing next action section if it exists
    // Use exact text match to find the heading
    const projectsHeading = page.getByRole('heading', {
      name: /Projects Needing Next Action/,
      exact: false
    });

    // If projects section exists, verify links work
    const projectsSection = projectsHeading.first();
    if (await projectsSection.isVisible().catch(() => false)) {
      // Projects should have links to /projects/:id
      const projectLinks = page.locator('a[href^="/projects/"]');
      const linkCount = await projectLinks.count();

      if (linkCount > 0) {
        const firstLink = projectLinks.first();
        const href = await firstLink.getAttribute('href');
        expect(href).toMatch(/^\/projects\/[a-zA-Z0-9-]+$/);
      }
    }
  });
});

test.describe('Digest summary endpoint', () => {
  test('summary endpoint returns correct structure', async ({ request }) => {
    const response = await request.get('/api/digest/daily');

    // API should return 200 or handle auth
    expect([200, 401, 403]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();

      // Verify expected structure
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('activeTasks');
      expect(data.stats).toHaveProperty('activeProjects');
      expect(data.stats).toHaveProperty('ideas');
      expect(data).toHaveProperty('nextActions');

      // Verify numeric values
      expect(typeof data.stats.activeTasks).toBe('number');
      expect(typeof data.stats.activeProjects).toBe('number');
      expect(typeof data.stats.ideas).toBe('number');
    }
  });
});
