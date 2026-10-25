import { z } from 'zod';

export const AIConfigSchema = z.object({
	provider: z.enum(['anthropic', 'openai', 'gemini', 'openrouter', 'compatible']),
	model: z.string().trim().min(1),
	apiKey: z.string().trim().min(1),
	baseUrl: z.string().trim().optional()
});

export const AITestRequestSchema = z.object({
	config: AIConfigSchema
});

export const AIGenerationRequestSchema = z.object({
	config: AIConfigSchema,
	kind: z.enum(['deck', 'cards']),
	source: z.string().trim().min(1).max(12000),
	count: z.number().int().min(1).max(30),
	deckName: z.string().trim().optional()
});

export const AICardSchema = z.object({
	front: z.string().trim().min(1),
	back: z.string().trim().min(1)
});

export const AIProposalSchema = z.object({
	deckName: z.string().trim().min(1),
	summary: z.string().trim().min(1),
	cards: z.array(AICardSchema).min(1).max(30)
});

export type AIConfigInput = z.infer<typeof AIConfigSchema>;
export type AIGenerationRequestInput = z.infer<typeof AIGenerationRequestSchema>;
export type AIProposalOutput = z.infer<typeof AIProposalSchema>;
