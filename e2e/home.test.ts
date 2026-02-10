import { expect, test } from '@playwright/test';

test('home page has correct title and elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Total para Revisar')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Estatísticas' })).toBeVisible();
});
