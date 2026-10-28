import type { Deck, Flashcard } from './types.js';

/**
 * Escape a single CSV field per RFC 4180.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 * Internal quotes are doubled.
 */
function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Generate an Anki-compatible CSV string for one deck.
 * Columns: Front, Back, Tags, Deck
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function exportToAnkiCsv(deck: Deck, cards: Flashcard[]): string {
	const bom = '\uFEFF';
	const header = 'Front,Back,Tags,Deck\n';
	const rows = cards.map((card) => {
		const front = escapeCsvField(card.front);
		const back = escapeCsvField(card.back);
		const tags = escapeCsvField(card.tags.join(' '));
		const deckName = escapeCsvField(deck.name);
		return `${front},${back},${tags},${deckName}`;
	});
	return bom + header + rows.join('\n') + (rows.length > 0 ? '\n' : '');
}

/**
 * Trigger a browser file download for the given CSV content.
 */
export function downloadAnkiCsv(filename: string, csvContent: string): void {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
