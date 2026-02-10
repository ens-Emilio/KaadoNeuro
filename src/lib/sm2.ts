import type { Flashcard } from './types.js';

/**
 * Calcula os parâmetros da próxima revisão usando o algoritmo SM-2.
 * @param card O flashcard atual com seus parâmetros SM-2.
 * @param quality A qualidade da resposta (0 a 5).
 *   5 - resposta perfeita com facilidade.
 *   4 - resposta correta com hesitação.
 *   3 - resposta correta com dificuldade.
 *   2 - resposta incorreta, mas fácil de lembrar.
 *   1 - resposta incorreta, com dificuldade.
 *   0 - apagão total.
 * @returns Novos valores para interval, repetitions, easeFactor e dueDate.
 */
export function calculateReview(
    card: Flashcard,
    quality: number
): {
    interval: number;
    repetitions: number;
    easeFactor: number;
    dueDate: string
} {
    let { interval, repetitions, easeFactor } = card;

    if (quality >= 3) {
        // Resposta correta
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    } else {
        // Resposta incorreta: Reseta repetições e intervalo
        repetitions = 0;
        interval = 1;
    }

    // Atualiza Ease Factor (EF)
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // Onde q é a qualidade da resposta (0-5)
    const q = quality;
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

    // EF mínimo é 1.3
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calcula nova data de vencimento
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
        interval,
        repetitions,
        easeFactor,
        dueDate: dueDate.toISOString(),
    };
}
