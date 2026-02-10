import { writable, derived } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import type { Deck, Flashcard, ReviewLog } from './types.js';

// Stores persistidos no localStorage
export const decks = persisted<Deck[]>('kaadoneuro_decks', []);
export const cards = persisted<Flashcard[]>('kaadoneuro_cards', []);
export const reviewLogs = persisted<ReviewLog[]>('kaadoneuro_reviews', []);

// Streak Calculation
export const streak = derived(reviewLogs, ($logs) => {
    if ($logs.length === 0) return 0;

    const uniqueDates = Array.from(new Set($logs.map(log =>
        new Date(log.reviewedAt).toISOString().split('T')[0]
    ))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Se o último review não foi hoje nem ontem, o streak quebrou
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let currentStreak = 1;
    let lastDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const diffTime = Math.abs(lastDate.getTime() - currentDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
            lastDate = currentDate;
        } else {
            break;
        }
    }

    return currentStreak;
});

// Função auxiliar para criar ID único (UUID v4 simplificado ou usar lib se preferir)
export function generateId(): string {
    return crypto.randomUUID();
}
