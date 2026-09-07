import { test, expect } from '@playwright/test';

test.describe('Overnight QA Fuzz Testing', () => {
  test.use({ baseURL: 'http://localhost:5174' });

  test('startup stress test', async ({ page }) => {
    // We will do 20 startup cycles to check for crashes or infinite loading
    for (let i = 0; i < 20; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('rapid navigation fuzzing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Attempt rapid navigation if tabs exist
    for (let i = 0; i < 15; i++) {
      const tabs = await page.locator('nav a, nav button').all();
      if (tabs.length > 0) {
        // click a random tab
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        await randomTab.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(50);
    }
  });
  
  test('form input fuzzing', async ({ page }) => {
    await page.goto('/');
    // Wait and find inputs
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
       await input.fill('test😊!@#$').catch(() => {});
       await input.fill('a'.repeat(200)).catch(() => {});
    }
  });
});
