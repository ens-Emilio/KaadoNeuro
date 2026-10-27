import { derived } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import type { Deck, Flashcard, ReviewLog } from './types.js';
import {
    decksArraySchema,
    cardsArraySchema,
    reviewLogsArraySchema,
    safeParseArray
} from './storage-schema.js';

/**
 * Formata uma data em formato YYYY-MM-DD usando o fuso horário LOCAL.
 * Evita problemas de streak quebrando após as 21h em fusos negativos
 * quando se usa toISOString() (que é UTC).
 */
function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Stores persistidos com validação zod na leitura.
// Dados corrompidos são filtrados silenciosamente (ver console.warn).
export const decks = persisted<Deck[]>('kaadoneuro_decks', [], {
    serializer: {
        stringify: (value) => JSON.stringify(value),
        parse: (raw) => safeParseArray(JSON.parse(raw ?? '[]'), decksArraySchema, 'decks')
    }
});

export const cards = persisted<Flashcard[]>('kaadoneuro_cards', [], {
    serializer: {
        stringify: (value) => JSON.stringify(value),
        parse: (raw) => safeParseArray(JSON.parse(raw ?? '[]'), cardsArraySchema, 'cards')
    }
});

export const reviewLogs = persisted<ReviewLog[]>('kaadoneuro_reviews', [], {
    serializer: {
        stringify: (value) => JSON.stringify(value),
        parse: (raw) => safeParseArray(JSON.parse(raw ?? '[]'), reviewLogsArraySchema, 'reviewLogs')
    }
});

// Streak Calculation — usa datas locais para respeitar o fuso do usuário
export const streak = derived(reviewLogs, ($logs) => {
    if ($logs.length === 0) return 0;

    const uniqueDates = Array.from(new Set($logs.map(log =>
        getLocalDateString(new Date(log.reviewedAt))
    ))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    const today = getLocalDateString(new Date());
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

    // Se o último review não foi hoje nem ontem, o streak quebrou
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let currentStreak = 1;
    let lastDateStr = uniqueDates[0];

    for (let i = 1; i < uniqueDates.length; i++) {
        const currentDateStr = uniqueDates[i];
        const diffTime = Math.abs(
            new Date(lastDateStr).getTime() - new Date(currentDateStr).getTime()
        );
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
            lastDateStr = currentDateStr;
        } else {
            break;
        }
    }

    return currentStreak;
});

// Store derivado com todas as tags únicas de todos os cards, ordenadas alfabeticamente.
// Usado para filtros cruzados entre decks e UI de chips.
export const allTags = derived(cards, ($cards) => {
	const tagSet = new Set<string>();
	for (const card of $cards) {
		if (Array.isArray(card.tags)) {
			for (const tag of card.tags) {
				if (typeof tag === 'string' && tag.trim().length > 0) {
					tagSet.add(tag.trim());
				}
			}
		}
	}
	return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
});

// Configuração de limite de cards por sessão de review.
// 0 = sem limite (revisa todos os vencidos). Padrão: 50.
export const sessionLimit = persisted<number>('kaadoneuro_session_limit', 50, {
    serializer: {
        stringify: (value) => JSON.stringify(value),
        parse: (raw) => {
            const n = Number(JSON.parse(raw ?? '50'));
            return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 50;
        }
    }
});

// Função auxiliar para criar ID único (UUID v4 simplificado ou usar lib se preferir)
export function generateId(): string {
    return crypto.randomUUID();
}
