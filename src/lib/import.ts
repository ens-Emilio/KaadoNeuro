/** Upper bound for user-supplied import files (JSON deck or full backup). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ParsedCard = { front: string; back: string; cloze?: string; tags?: string[] };

export function parseImport(text: string, limit = 50000): ParsedCard[] | { error: string } {
	if (text.length > limit) return { error: `Text too long. Limit of ${limit} characters.` };
	let out: ParsedCard[] = [];
	const trimmed = text.trim();
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		try {
			const json = JSON.parse(trimmed);
			if (Array.isArray(json)) {
				out = json
					.filter((c) => c?.front && c?.back)
					.map((c) => {
						const clozeMatch = String(c.back).match(/\{\{(.+?)\}\}/);
						return {
							front: String(c.front).trim(),
							back: String(c.back).trim(),
							...(clozeMatch ? { cloze: clozeMatch[1].trim() } : {})
						};
					});
				if (out.length > 0) return out;
			}
		} catch {
			// Not JSON: fall through to the text/Markdown parser below.
		}
	}
	const chunks = trimmed
		.split('---')
		.map((c) => c.trim())
		.filter(Boolean);
	for (const chunk of chunks) {
		const lines = chunk.split('\n');
		const f = lines[0].replace(/^#\s*/, '').trim();
		const b = lines.slice(1).join('\n').trim();
		if (f && b) {
			const clozeMatch = b.match(/\{\{(.+?)\}\}/);
			out.push({ front: f, back: b, ...(clozeMatch ? { cloze: clozeMatch[1].trim() } : {}) });
		}
	}
	if (out.length === 0) {
		const lines = trimmed
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		for (const l of lines) {
			const sep = l.includes('::') ? '::' : l.includes('|') ? '|' : '';
			if (sep) {
				const [front, ...rest] = l.split(sep);
				const back = rest.join(sep).trim();
				if (front.trim() && back) {
					const clozeMatch = back.match(/\{\{(.+?)\}\}/);
					out.push({
						front: front.trim(),
						back,
						...(clozeMatch ? { cloze: clozeMatch[1].trim() } : {})
					});
				}
			}
		}
	}
	return out;
}

export function formatDateShort(iso: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' })
		.format(new Date(iso))
		.toUpperCase();
}
