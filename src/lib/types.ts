export interface Flashcard {
	id: string; // UUID
	deckId: string;
	front: string;
	back: string;
	tags: string[]; // tags para filtragem cruzada entre decks
	cloze?: string; // expected answer for cloze deletion cards (text inside {{ }})

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
	sm2Overrides?: {
		initialInterval?: number; // days for first review (default 1)
		efModifier?: number; // additive modifier to EF calculation (default 0)
		maxInterval?: number; // cap interval in days (default unlimited)
	};
}

export interface ReviewLog {
	id: string;
	cardId: string;
	quality: number; // 0-5
	reviewedAt: string;
}
