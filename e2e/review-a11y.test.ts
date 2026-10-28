import { expect, test } from '@playwright/test';

const deckId = '11111111-1111-4111-8111-111111111111';

test('review flow hides the back face until flip and moves focus to ratings', async ({ page }) => {
	await page.addInitScript(
		({ deckId }) => {
			const now = new Date().toISOString();
			localStorage.setItem(
				'kaadoneuro_decks',
				JSON.stringify([{ id: deckId, name: 'Keyboard deck', createdAt: now }])
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
						dueDate: now,
						createdAt: now
					}
				])
			);
			localStorage.setItem('kaadoneuro_reviews', '[]');
		},
		{ deckId }
	);

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
