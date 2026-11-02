/**
 * Generic CSV Import for KaadoNeuro
 * Supports RFC 4180 compliant parsing with auto-detection of delimiters.
 */

export interface CsvRow {
	[index: number]: string;
}

export interface CsvParseResult {
	headers: string[];
	rows: CsvRow[];
	errors: string[];
}

export interface ColumnMapping {
	front: number | null;
	back: number | null;
	tags: number | null;
	cloze: number | null;
}

export interface MappedCard {
	front: string;
	back: string;
	tags?: string[];
	cloze?: string;
}

/**
 * Detects the delimiter used in the first line of a CSV file.
 * Prioritizes comma over semicolon if both are present, but checks frequency.
 */
export function detectDelimiter(line: string): ',' | ';' {
	const commas = (line.match(/,/g) || []).length;
	const semicolons = (line.match(/;/g) || []).length;
	return semicolons > commas ? ';' : ',';
}

/**
 * Parses a single CSV line respecting quoted fields (RFC 4180).
 */
function parseCsvLine(line: string, delimiter: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		if (inQuotes) {
			if (char === '"') {
				// Check for escaped quote ""
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i += 2;
					continue;
				} else {
					inQuotes = false;
					i++;
					continue;
				}
			} else {
				current += char;
				i++;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
				i++;
			} else if (char === delimiter) {
				result.push(current);
				current = '';
				i++;
			} else {
				current += char;
				i++;
			}
		}
	}
	result.push(current);
	return result;
}

/**
 * Parses CSV content into rows and headers.
 * Handles multi-line quoted fields by joining lines until quotes are balanced.
 */
export function parseCsv(content: string): CsvParseResult {
	const errors: string[] = [];
	const lines = content.split(/\r?\n/);

	if (lines.length === 0) {
		return { headers: [], rows: [], errors: ['Empty file'] };
	}

	// Rejoin lines that are part of a quoted field
	const processedLines: string[] = [];
	let currentLine = '';
	let inQuotes = false;

	for (const line of lines) {
		if (!inQuotes) {
			currentLine = line;
			// Count quotes to see if we are inside a quoted field that spans multiple lines
			const quoteCount = (line.match(/"/g) || []).length;
			if (quoteCount % 2 !== 0) {
				inQuotes = true;
			} else {
				processedLines.push(currentLine);
				currentLine = '';
			}
		} else {
			currentLine += '\n' + line;
			const quoteCount = (line.match(/"/g) || []).length;
			if (quoteCount % 2 !== 0) {
				inQuotes = false;
				processedLines.push(currentLine);
				currentLine = '';
			}
		}
	}
	if (currentLine) {
		processedLines.push(currentLine);
	}

	if (processedLines.length === 0) {
		return { headers: [], rows: [], errors: ['No data found'] };
	}

	const delimiter = detectDelimiter(processedLines[0]);
	const headers = parseCsvLine(processedLines[0], delimiter).map((h) => h.trim());

	const rows: CsvRow[] = [];
	for (let i = 1; i < processedLines.length; i++) {
		const line = processedLines[i].trim();
		if (!line) continue;

		try {
			const values = parseCsvLine(line, delimiter);
			const row: CsvRow = {};
			values.forEach((val, idx) => {
				row[idx] = val.trim();
			});
			rows.push(row);
		} catch (e) {
			errors.push(`Error parsing line ${i + 1}: ${(e as Error).message}`);
		}
	}

	return { headers, rows, errors };
}

/**
 * Auto-detects column mapping based on header names.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
	const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

	const frontIndex = lowerHeaders.findIndex(
		(h) =>
			h.includes('front') || h.includes('question') || h.includes('pergunta') || h.includes('termo')
	);

	const backIndex = lowerHeaders.findIndex(
		(h) =>
			h.includes('back') ||
			h.includes('answer') ||
			h.includes('resposta') ||
			h.includes('definição') ||
			h.includes('significado')
	);

	const tagsIndex = lowerHeaders.findIndex(
		(h) =>
			h.includes('tag') || h.includes('label') || h.includes('categoria') || h.includes('etiqueta')
	);

	const clozeIndex = lowerHeaders.findIndex(
		(h) => h.includes('cloze') || h.includes('oculto') || h.includes('missing')
	);

	return {
		front: frontIndex >= 0 ? frontIndex : null,
		back: backIndex >= 0 ? backIndex : null,
		tags: tagsIndex >= 0 ? tagsIndex : null,
		cloze: clozeIndex >= 0 ? clozeIndex : null
	};
}

/**
 * Maps CSV rows to Flashcard-compatible objects using the provided mapping.
 */
export function mapRowsToCards(
	rows: CsvRow[],
	mapping: ColumnMapping
): { cards: MappedCard[]; errors: string[] } {
	const cards: MappedCard[] = [];
	const errors: string[] = [];

	rows.forEach((row, index) => {
		if (mapping.front === null || mapping.back === null) {
			if (index === 0) errors.push('Front and Back columns must be mapped.');
			return;
		}

		const front = row[mapping.front];
		const back = row[mapping.back];

		if (!front || !back) {
			errors.push(`Row ${index + 1} is missing front or back content.`);
			return;
		}

		const card: MappedCard = {
			front,
			back
		};

		if (mapping.tags !== null && row[mapping.tags]) {
			card.tags = row[mapping.tags]
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
		}

		if (mapping.cloze !== null && row[mapping.cloze]) {
			card.cloze = row[mapping.cloze];
		} else {
			// Auto-detect cloze from back if not explicitly mapped
			const clozeMatch = back.match(/\{\{(.+?)\}\}/);
			if (clozeMatch) {
				card.cloze = clozeMatch[1].trim();
			}
		}

		cards.push(card);
	});

	return { cards, errors };
}
