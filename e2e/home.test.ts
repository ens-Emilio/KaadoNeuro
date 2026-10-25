import { expect, test } from '@playwright/test';

test('home page has correct title and elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('heading', { name: /prontos para revisar|ready to review/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Estatísticas' })).toBeVisible();
});
