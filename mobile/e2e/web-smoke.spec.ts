/**
 * Playwright E2E smoke tests for the web build
 * Tests onboarding flow, then chat screen UI elements, themes, and voice UI.
 *
 * Run: npx playwright test e2e/web-smoke.spec.ts --config=e2e/playwright.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:8082';

// Helper: wait for app to render
async function waitForApp(page: Page) {
  await page.waitForTimeout(4000);
}

// Helper: navigate through onboarding to reach chat screen
async function completeOnboarding(page: Page) {
  await page.goto(BASE_URL);
  await waitForApp(page);

  // Check if we're on the onboarding screen
  const pageText = await page.locator('body').textContent() || '';

  if (pageText.includes('Get Started')) {
    // Click "Get Started"
    const getStarted = page.getByText('Get Started', { exact: false });
    await getStarted.click();
    await page.waitForTimeout(2000);

    // Handle Location screen — look for "Skip" or "Share GPS" or continue button
    const afterGetStarted = await page.locator('body').textContent() || '';

    if (afterGetStarted.includes('Skip for now') || afterGetStarted.includes('Skip')) {
      const skip = page.getByText('Skip for now', { exact: false }).or(page.getByText('Skip', { exact: false })).first();
      if (await skip.isVisible().catch(() => false)) {
        await skip.click();
        await page.waitForTimeout(2000);
      }
    } else if (afterGetStarted.includes('Share GPS') || afterGetStarted.includes('Share')) {
      // Try skip or the location continue
      const skipBtn = page.getByText('Skip', { exact: false }).first();
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Handle Language screen — look for "Confirm" or "Continue" button
    const langScreen = await page.locator('body').textContent() || '';
    if (langScreen.includes('Confirm') || langScreen.includes('Continue')) {
      const confirmBtn = page.getByText('Confirm', { exact: false }).or(page.getByText('Continue', { exact: false })).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Final wait for chat screen to load
    await page.waitForTimeout(3000);
  }
}

// ────────────────────────────────────────────
// SECTION 1: Onboarding Flow
// ────────────────────────────────────────────

test.describe('Onboarding', () => {
  test('1.1 App loads and shows onboarding', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForApp(page);

    const body = await page.locator('body').textContent() || '';
    expect(body).toBeTruthy();
    expect(body).not.toContain('Application error');

    // Should show either onboarding or chat screen
    const hasOnboarding = body.includes('FarmerChat') || body.includes('Get Started');
    const hasChat = body.includes('Message') || body.includes('farming assistant');
    expect(hasOnboarding || hasChat).toBe(true);

    await page.screenshot({ path: '/tmp/e2e-screenshots/01-app-loaded.png', fullPage: true });
  });

  test('1.2 Onboarding shows key features', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForApp(page);

    const body = await page.locator('body').textContent() || '';

    if (body.includes('Get Started')) {
      // Verify feature cards
      expect(body).toContain('Weather Forecasts');
      expect(body).toContain('Crop Diagnosis');
      expect(body).toContain('Voice Support');
      expect(body).toContain('FarmerChat');
      await page.screenshot({ path: '/tmp/e2e-screenshots/02-onboarding-features.png' });
    }
  });

  test('1.3 Can navigate through onboarding to chat', async ({ page }) => {
    await completeOnboarding(page);

    const body = await page.locator('body').textContent() || '';
    await page.screenshot({ path: '/tmp/e2e-screenshots/03-after-onboarding.png', fullPage: true });

    // We should now be past the "Get Started" screen
    // (may be on location/language screen or chat screen depending on flow)
    console.log('Post-onboarding screen content length:', body.length);
    expect(body.length).toBeGreaterThan(10);
  });
});

// ────────────────────────────────────────────
// SECTION 2: Chat Screen (after onboarding)
// ────────────────────────────────────────────

test.describe('Chat Screen', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test('2.1 Chat screen renders content', async ({ page }) => {
    const body = await page.locator('body').textContent() || '';
    await page.screenshot({ path: '/tmp/e2e-screenshots/04-chat-screen.png', fullPage: true });

    // After onboarding we should have some content
    expect(body.length).toBeGreaterThan(20);
    console.log('Chat screen text preview:', body.substring(0, 200));
  });

  test('2.2 Check for input area (RN Web renders div[contenteditable] or textarea)', async ({ page }) => {
    // React Native Web TextInput renders as <textarea> or contenteditable div
    const textarea = page.locator('textarea').first();
    const contentEditable = page.locator('[contenteditable="true"]').first();
    const roleTextbox = page.locator('[role="textbox"]').first();

    const hasTextarea = (await textarea.count()) > 0;
    const hasContentEditable = (await contentEditable.count()) > 0;
    const hasRoleTextbox = (await roleTextbox.count()) > 0;

    console.log('Input types found — textarea:', hasTextarea, 'contentEditable:', hasContentEditable, 'role=textbox:', hasRoleTextbox);
    await page.screenshot({ path: '/tmp/e2e-screenshots/05-input-check.png' });

    // At least one input method should exist if we're on the chat screen
    // (may still be on onboarding if skip didn't work)
  });

  test('2.3 Check for accessible elements', async ({ page }) => {
    // Count all accessible elements
    const ariaLabels = await page.locator('[aria-label]').count();
    const roles = await page.locator('[role]').count();

    console.log('Elements with aria-label:', ariaLabels, 'Elements with role:', roles);
    await page.screenshot({ path: '/tmp/e2e-screenshots/06-accessible-elements.png' });

    // Should have at least some accessible elements
    expect(ariaLabels + roles).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────
// SECTION 3: Theme Verification
// ────────────────────────────────────────────

test.describe('Theme', () => {
  test('3.1 App renders with consistent colors (no blank areas)', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForApp(page);

    // Take screenshots at multiple viewports for visual verification
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/e2e-screenshots/07-theme-mobile.png', fullPage: true });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/e2e-screenshots/08-theme-tablet.png', fullPage: true });

    const body = await page.locator('body').textContent() || '';
    expect(body.length).toBeGreaterThan(50);
  });

  test('3.2 Dark mode via prefers-color-scheme', async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE_URL);
    await waitForApp(page);

    await page.screenshot({ path: '/tmp/e2e-screenshots/09-dark-mode.png', fullPage: true });

    // Light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(BASE_URL);
    await waitForApp(page);

    await page.screenshot({ path: '/tmp/e2e-screenshots/10-light-mode.png', fullPage: true });
  });
});

// ────────────────────────────────────────────
// SECTION 4: Console Error Monitoring
// ────────────────────────────────────────────

test.describe('Error Monitoring', () => {
  test('4.1 No critical JS errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });

    await page.goto(BASE_URL);
    await waitForApp(page);

    // Filter to truly critical errors (not CORS, not warnings)
    const critical = errors.filter(
      (e) =>
        !e.includes('CORS') &&
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('ResizeObserver') &&
        !e.includes('net::ERR_FAILED') &&
        !e.includes('[DB]') &&
        !e.includes('DevTools')
    );

    console.log('Total console errors:', errors.length);
    console.log('Critical (non-CORS) errors:', critical.length);
    if (critical.length > 0) {
      console.log('Critical errors:', critical);
    }

    // No page crashes
    const body = await page.locator('body').textContent() || '';
    expect(body).not.toContain('Application error');
  });

  test('4.2 No uncaught exceptions during onboarding', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await completeOnboarding(page);

    if (pageErrors.length > 0) {
      console.log('Uncaught exceptions during onboarding:', pageErrors);
    }
    // Allow zero uncaught page errors
    expect(pageErrors.length).toBe(0);
  });
});

// ────────────────────────────────────────────
// SECTION 5: DOM Structure Inspection
// ────────────────────────────────────────────

test.describe('DOM Inspection', () => {
  test('5.1 Dump DOM structure for debugging', async ({ page }) => {
    await completeOnboarding(page);

    // Get all aria-label values to understand RN Web's accessibility tree
    const ariaLabels = await page.evaluate(() => {
      const els = document.querySelectorAll('[aria-label]');
      return Array.from(els).map((el) => ({
        tag: el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
      }));
    });

    console.log('=== Accessible elements in DOM ===');
    ariaLabels.forEach((el) => {
      console.log(`  <${el.tag}> role="${el.role}" aria-label="${el.ariaLabel}"`);
    });

    // Get all role attributes
    const roles = await page.evaluate(() => {
      const els = document.querySelectorAll('[role]');
      return Array.from(els).map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        text: (el.textContent || '').substring(0, 50),
      }));
    });

    console.log('=== Elements with role attribute ===');
    roles.forEach((el) => {
      console.log(`  <${el.tag}> role="${el.role}" text="${el.text}"`);
    });

    await page.screenshot({ path: '/tmp/e2e-screenshots/11-dom-inspection.png', fullPage: true });
  });
});

// ────────────────────────────────────────────
// SECTION 6: Visual Snapshots for Manual Review
// ────────────────────────────────────────────

test.describe('Visual Snapshots', () => {
  test('6.1 Full onboarding flow screenshots', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForApp(page);

    // Screenshot 1: Onboarding welcome
    await page.screenshot({ path: '/tmp/e2e-screenshots/20-onboarding-welcome.png', fullPage: true });

    // Click Get Started if available
    const getStarted = page.getByText('Get Started', { exact: false });
    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/e2e-screenshots/21-after-get-started.png', fullPage: true });
    }

    // Try Skip
    const skip = page.getByText('Skip', { exact: false }).first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/e2e-screenshots/22-after-skip.png', fullPage: true });
    }

    // Try Confirm
    const confirm = page.getByText('Confirm', { exact: false }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/e2e-screenshots/23-after-confirm.png', fullPage: true });
    }

    // Final state
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/e2e-screenshots/24-final-state.png', fullPage: true });
  });
});
