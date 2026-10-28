import { expect, test } from '@playwright/test';

test('home page renders the deck dashboard for an existing deck', async ({ page }) => {
	await page.addInitScript(() => {
		const now = new Date().toISOString();
		localStorage.setItem(
			'kaadoneuro_decks',
			JSON.stringify([
				{
					id: '33333333-3333-4333-8333-333333333333',
					name: 'Existing deck',
					createdAt: now
				}
			])
		);
		localStorage.setItem('kaadoneuro_cards', '[]');
		localStorage.setItem('kaadoneuro_reviews', '[]');
	});

	await page.goto('/');
	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole('heading', { name: /ready to review|prontos para revisar/i })
	).toBeVisible();
	await expect(page.getByRole('link', { name: /statistics|estatísticas/i })).toBeVisible();
	await expect(page.getByText('Existing deck', { exact: true })).toBeVisible();
});
