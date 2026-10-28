import { expect, test } from '@playwright/test';

test('vault requires a passphrase and never restores the secret into the form', async ({
	page
}) => {
	await page.goto('/settings/ai');

	// Fresh browser: create the vault before any credential can be stored.
	const passphrase = page.getByLabel(/passphrase|frase-senha/i).first();
	await expect(passphrase).toBeVisible();
	await passphrase.fill('correct horse battery staple');

	const confirm = page.getByLabel(/confirm passphrase|confirmar frase-senha/i);
	if (await confirm.count()) await confirm.fill('correct horse battery staple');

	const submit = page
		.getByRole('button', { name: /create vault|criar cofre|unlock vault|desbloquear cofre/i })
		.last();
	await submit.click();

	await page
		.getByLabel(/api key|chave de ia|chave/i)
		.first()
		.fill('test-secret-value');
	await page.getByRole('button', { name: /save configuration|salvar/i }).click();

	const stored = await page.evaluate(() => localStorage.getItem('kaadoneuro_ai_config'));
	expect(stored).not.toContain('test-secret-value');
	expect(stored).toContain('enc:v3:');

	await page.reload();
	await expect(page.getByLabel(/api key|chave de ia|chave/i).first()).toHaveValue('');
	await expect(page.getByRole('button', { name: /unlock vault|desbloquear cofre/i })).toBeVisible();
});
