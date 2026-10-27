export interface Flashcard {
    id: string; // UUID
    deckId: string;
    front: string;
    back: string;
    tags: string[]; // tags para filtragem cruzada entre decks

    // SM-2 params
    interval: number; // dias até a próxima revisão
    repetitions: number; // número de revisões consecutivas com sucesso
    easeFactor: number; // fator de facilidade (default 2.5)
    dueDate: string; // ISO date string da próxima revisão
    createdAt: string;
}

export interface Deck {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
}

export interface ReviewLog {
    id: string;
    cardId: string;
    quality: number; // 0-5
    reviewedAt: string;
}
