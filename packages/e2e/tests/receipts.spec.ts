import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Receipts (Audit Trail) page
 * Tests the receipts listing, filtering, pagination, and detail modal.
 */

test.describe('Receipts Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to receipts page
    await page.goto('/receipts');
  });

  test('page loads and shows header', async ({ page }) => {
    // Verify page title and description
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible();
    await expect(page.getByText('processing receipt')).toBeVisible();
    await expect(page.getByText('audit trail of all AI decisions')).toBeVisible();
  });

  test('shows refresh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('shows filter controls', async ({ page }) => {
    // Classification filter dropdown
    await expect(page.getByRole('combobox').filter({ hasText: /All types|Task|Project|Idea|Person/ }).first()).toBeVisible();

    // Confidence filter dropdown
    await expect(page.getByRole('combobox').filter({ hasText: /All confidence|High|Medium|Low/ })).toBeVisible();

    // Date range inputs
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });

  test('shows empty state when no receipts exist', async ({ page }) => {
    // This test checks that the empty state displays correctly
    // It will be skipped if there are existing receipts
    const emptyMessage = page.getByText('No receipts yet');
    const receiptsExist = (await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count()) > 0;

    if (!receiptsExist) {
      await expect(emptyMessage).toBeVisible();
    } else {
      // Skip this test if receipts exist
      test.skip();
    }
  });

  test('displays receipts list when data exists', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check if loading skeleton is gone
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, { timeout: 10000 });

    // Check for either receipts or empty state
    const hasReceipts = (await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count()) > 0;
    const hasEmptyState = await page.getByText('No receipts yet').isVisible().catch(() => false);

    expect(hasReceipts || hasEmptyState).toBe(true);
  });

  test('receipt cards show required information', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Skip if no receipts
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    // Each receipt card should show:
    // - Classification badge (task/project/idea/person/unknown)
    // - Confidence percentage
    // - Model info
    // - Time
    const receiptCard = firstReceipt;

    // Classification badge - text contains classification type
    await expect(receiptCard.locator('span').filter({ hasText: /task|project|idea|person|unknown/ }).first()).toBeVisible();

    // Confidence percentage (ends with %)
    await expect(receiptCard.locator('span').filter({ hasText: /\d+%/ }).first()).toBeVisible();
  });
});

test.describe('Receipts Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');
  });

  test('classification filter filters by type', async ({ page }) => {
    // Select "Task" from classification dropdown
    const classificationSelect = page.locator('select').first();
    await classificationSelect.selectOption('task');

    // Wait for filter to apply
    await page.waitForLoadState('networkidle');

    // Clear filters button should appear
    const clearButton = page.getByRole('button', { name: 'Clear filters' });
    await expect(clearButton).toBeVisible();
  });

  test('confidence filter filters by confidence level', async ({ page }) => {
    // Select confidence range
    const confidenceSelect = page.locator('select').nth(1);
    await confidenceSelect.selectOption('0.8-1');

    await page.waitForLoadState('networkidle');

    // Clear filters button should appear
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  test('date filters work', async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]');

    // Set start date to a week ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const startDateStr = weekAgo.toISOString().split('T')[0];

    await dateInputs.first().fill(startDateStr);
    await page.waitForLoadState('networkidle');

    // Clear filters button should appear
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  test('clear filters button resets all filters', async ({ page }) => {
    // Apply a filter first
    const classificationSelect = page.locator('select').first();
    await classificationSelect.selectOption('task');
    await page.waitForLoadState('networkidle');

    // Click clear filters
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.waitForLoadState('networkidle');

    // Clear button should be gone
    await expect(page.getByRole('button', { name: 'Clear filters' })).not.toBeVisible();

    // Dropdowns should be reset to default
    await expect(classificationSelect).toHaveValue('');
  });
});

test.describe('Receipts Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');
  });

  test('shows pagination controls when more than page limit', async ({ page }) => {
    // Pagination appears when total > limit (20)
    const paginationText = page.getByText(/\d+-\d+ of \d+/);
    const nextButton = page.getByRole('button', { name: 'Next' });
    const prevButton = page.getByRole('button', { name: 'Previous' });

    // Check if pagination exists (requires >20 receipts)
    const hasPagination = await paginationText.isVisible().catch(() => false);

    if (hasPagination) {
      await expect(nextButton).toBeVisible();
      await expect(prevButton).toBeVisible();

      // Previous should be disabled on first page
      await expect(prevButton).toBeDisabled();
    } else {
      // No pagination needed - less than 20 items
      test.skip();
    }
  });

  test('next and previous buttons navigate pages', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: 'Next' });
    const hasPagination = await nextButton.isVisible().catch(() => false);

    if (!hasPagination) {
      test.skip();
      return;
    }

    // Check if Next is enabled
    const isNextDisabled = await nextButton.isDisabled();
    if (isNextDisabled) {
      test.skip();
      return;
    }

    // Get current pagination text
    const paginationBefore = await page.getByText(/\d+-\d+ of \d+/).textContent();

    // Click next
    await nextButton.click();
    await page.waitForLoadState('networkidle');

    // Pagination text should change
    const paginationAfter = await page.getByText(/\d+-\d+ of \d+/).textContent();
    expect(paginationAfter).not.toBe(paginationBefore);

    // Previous should now be enabled
    await expect(page.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
  });
});

test.describe('Receipt Details Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');
  });

  test('clicking receipt opens detail modal', async ({ page }) => {
    // Skip if no receipts
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    // Click the first receipt
    await firstReceipt.click();

    // Modal should appear with title "Receipt Details"
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });
  });

  test('modal shows all receipt fields', async ({ page }) => {
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    await firstReceipt.click();

    // Wait for modal
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });

    // Check for expected sections
    await expect(page.getByText('Original Capture')).toBeVisible();
    await expect(page.getByText('Classification')).toBeVisible();
    await expect(page.getByText('Confidence')).toBeVisible();
    await expect(page.getByText('Extracted Fields')).toBeVisible();
    await expect(page.getByText('Model')).toBeVisible();
    await expect(page.getByText('Timestamp')).toBeVisible();

    // IDs section
    await expect(page.getByText('IDs')).toBeVisible();
    await expect(page.getByText('Receipt:')).toBeVisible();
  });

  test('modal shows database writes if present', async ({ page }) => {
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    await firstReceipt.click();
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });

    // Database Writes section appears if writes exist
    const writesSection = page.getByText('Database Writes');
    const hasWrites = await writesSection.isVisible().catch(() => false);

    if (hasWrites) {
      // Should show action badges (create/update)
      const actionBadge = page.locator('span').filter({ hasText: /^(create|update)$/ });
      await expect(actionBadge.first()).toBeVisible();
    }
  });

  test('modal can be closed', async ({ page }) => {
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    await firstReceipt.click();
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });

    // Close the modal (click X or outside)
    // Look for close button or click escape
    await page.keyboard.press('Escape');

    // Modal should be gone
    await expect(page.locator('h3:has-text("Receipt Details")')).not.toBeVisible();
  });
});

test.describe('Receipt Entity Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');
  });

  test('entity links in writes section are clickable', async ({ page }) => {
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    await firstReceipt.click();
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });

    // Check for entity links in the writes section
    const entityLink = page.locator('a[href*="/browse?type="]').first();
    const hasEntityLinks = await entityLink.isVisible().catch(() => false);

    if (!hasEntityLinks) {
      test.skip();
      return;
    }

    // Verify link format: /browse?type=<entityType>&id=<entityId>
    const href = await entityLink.getAttribute('href');
    expect(href).toMatch(/\/browse\?type=(task|project|idea|person)&id=/);
  });

  test('inbox item link is present for receipts with source', async ({ page }) => {
    const firstReceipt = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').first();
    const receiptCount = await page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer').count();
    const hasReceipts = receiptCount > 0;

    if (!hasReceipts) {
      test.skip();
      return;
    }

    await firstReceipt.click();
    await expect(page.locator('h3:has-text("Receipt Details")')).toBeVisible({ timeout: 10000 });

    // Look for inbox item link or "none" indicator
    const inboxSection = page.getByText('Inbox Item:');
    await expect(inboxSection).toBeVisible();

    // Either has a link or shows "none"
    const inboxLink = page.locator('a[href*="/inbox?id="]');
    const noneText = page.getByText('none').first();

    const hasInboxLink = await inboxLink.isVisible().catch(() => false);
    const hasNoneIndicator = await noneText.isVisible().catch(() => false);

    expect(hasInboxLink || hasNoneIndicator).toBe(true);
  });
});

test.describe('Receipt Previous Receipt Diff', () => {
  test('shows diff view when previousReceiptId exists', async ({ page }) => {
    await page.goto('/receipts');
    await page.waitForLoadState('networkidle');

    // This test requires a receipt with previousReceiptId
    // Click through receipts to find one with diff view
    const receipts = page.locator('.bg-white.rounded-lg.border.p-4.cursor-pointer');
    const count = await receipts.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Check first few receipts for diff view
    for (let i = 0; i < Math.min(count, 5); i++) {
      await receipts.nth(i).click();
      await page.waitForLoadState('networkidle');

      const diffLabel = page.getByText('This is a fix receipt');
      const hasDiff = await diffLabel.isVisible().catch(() => false);

      if (hasDiff) {
        // Found a receipt with diff view
        await expect(diffLabel).toBeVisible();
        await expect(page.getByText('Previous:')).toBeVisible();
        await expect(page.getByText('Current:')).toBeVisible();
        return;
      }

      // Close modal and try next
      await page.keyboard.press('Escape');
    }

    // No receipts with diff view found - that's okay
    test.skip();
  });
});
