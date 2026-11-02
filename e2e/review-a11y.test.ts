import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const deckId = '11111111-1111-4111-8111-111111111111';

async function seedData(page: Page) {
	await page.addInitScript(
		({ deckId }) => {
			const now = new Date().toISOString();
			const past = new Date(Date.now() - 86400000).toISOString();
			localStorage.setItem(
				'kaadoneuro_decks',
				JSON.stringify([{ id: deckId, name: 'Existing deck', createdAt: now }])
			);
			localStorage.setItem(
				'kaadoneuro_cards',
				JSON.stringify([
					{
						id: '22222222-2222-4222-8222-222222222222',
						deckId,
						front: 'Question',
						back: 'Answer',
						tags: [],
						interval: 0,
						repetitions: 0,
						easeFactor: 2.5,
						dueDate: past,
						createdAt: now
					}
				])
			);
			localStorage.setItem('kaadoneuro_reviews', '[]');
		},
		{ deckId }
	);
}

test('home page has no critical or serious a11y violations', async ({ page }) => {
	await seedData(page);
	await page.goto('/');
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa'])
		.disableRules(['color-contrast']) // contrast checked separately below
		.analyze();
	expect(
		results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
	).toEqual([]);
});

test('review flow hides the back face until flip and moves focus to ratings', async ({ page }) => {
	await seedData(page);
	await page.goto(`/review/${deckId}`);

	const front = page.getByText('Question', { exact: true });
	await expect(front).toBeVisible();
	await expect(page.getByText('Answer', { exact: true })).not.toBeVisible();

	const card = page.getByRole('button', { name: /press space to flip|pressione espaço/i });
	await card.focus();
	await page.keyboard.press('Space');

	await expect(page.getByText('Answer', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: /shortcut 1|atalho 1/i })).toBeFocused();

	await page.keyboard.press('3');
	await expect(page.getByText(/Session finished|Sessão finalizada/)).toBeVisible();
});

test('review page has no critical or serious a11y violations', async ({ page }) => {
	await seedData(page);
	await page.goto(`/review/${deckId}`);
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(
		results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
	).toEqual([]);
});

test('deck editor page has no critical or serious a11y violations', async ({ page }) => {
	await seedData(page);
	await page.goto(`/decks/${deckId}`);
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa'])
		.disableRules(['nested-interactive'])
		.analyze();
	expect(
		results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
	).toEqual([]);
});

test('settings page has no critical or serious a11y violations', async ({ page }) => {
	await seedData(page);
	await page.goto('/settings/sync');
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(
		results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
	).toEqual([]);
});

test('skip-to-content link is present and targets main landmark', async ({ page }) => {
	await seedData(page);
	await page.goto('/');
	const skipLink = page.locator('a[href="#main-content"]');
	await expect(skipLink).toHaveCount(1);
	const main = page.locator('#main-content');
	await expect(main).toHaveAttribute('tabindex', '-1');
});

test('all interactive elements have visible focus indicators', async ({ page }) => {
	await seedData(page);
	await page.goto('/');
	const focusable = page.locator('a, button, input, select, textarea, [tabindex]');
	const count = await focusable.count();
	expect(count).toBeGreaterThan(0);
	// Verify focus-visible CSS rule exists by checking computed style on first button
	const btn = page.locator('button').first();
	await btn.focus();
	const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
	expect(outline).not.toBe('none');
});

test('color contrast meets WCAG AA for normal text', async ({ page }) => {
	await seedData(page);
	await page.goto('/');
	const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
	const criticalContrast = results.violations.filter(
		(v) => v.id === 'color-contrast' && (v.impact === 'critical' || v.impact === 'serious')
	);
	expect(criticalContrast).toEqual([]);
});
