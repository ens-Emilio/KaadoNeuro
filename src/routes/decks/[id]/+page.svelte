<script lang="ts">
	import { page } from '$app/state';
	import { decks, cards, generateId } from '$lib/stores.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Trash2, Plus, Upload } from '@lucide/svelte';

	// page.params em Svelte 5 via $app/state
	const deckId = page.params.id ?? '';

	// Derived state
	let deck = $derived($decks.find((d) => d.id === deckId));
	let deckCards = $derived($cards.filter((c) => c.deckId === deckId));

	let front = $state('');
	let back = $state('');
	let fileInput: HTMLInputElement;

	function updateDeckName(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!deck) return;
		decks.update((all) => all.map((d) => (d.id === deckId ? { ...d, name: input.value } : d)));
	}

	function addCard() {
		if (!front.trim() || !back.trim()) return;

		const newCard = {
			id: generateId(),
			deckId,
			front,
			back,
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: new Date().toISOString(),
			createdAt: new Date().toISOString()
		};

		cards.update((all) => [...all, newCard]);
		front = '';
		back = '';
	}

	function deleteCard(id: string) {
		cards.update((all) => all.filter((c) => c.id !== id));
	}

	function deleteDeck() {
		if (!confirm('Tem certeza? Isso apagará todos os cartões.')) return;
		cards.update((all) => all.filter((c) => c.deckId !== deckId));
		decks.update((all) => all.filter((d) => d.id !== deckId));
		goto('/');
	}

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const text = await file.text();
		let newCardsData: { front: string; back: string }[] = [];

		if (file.type === 'application/json' || file.name.endsWith('.json')) {
			try {
				const json = JSON.parse(text);
				if (Array.isArray(json)) {
					newCardsData = json.filter((c) => c.front && c.back);
				}
			} catch (err) {
				alert('JSON inválido');
				return;
			}
		} else {
			// Markdown parsing simplificado
			// Formato esperado:
			// # Pergunta
			// Resposta
			// ---
			// # Pergunta 2
			// Resposta 2

			const chunks = text
				.split('---')
				.map((c) => c.trim())
				.filter((c) => c);

			for (const chunk of chunks) {
				// Tenta separar por primeira quebra de linha ou marcador
				// Assumindo que a primeira linha (com ou sem #) é a frente
				const lines = chunk.split('\n');
				const f = lines[0].replace(/^#\s*/, '').trim();
				const b = lines.slice(1).join('\n').trim();

				if (f && b) {
					newCardsData.push({ front: f, back: b });
				}
			}
		}

		if (newCardsData.length > 0) {
			const now = new Date().toISOString();
			const toAdd = newCardsData.map((c) => ({
				id: generateId(),
				deckId,
				front: c.front,
				back: c.back,
				interval: 0,
				repetitions: 0,
				easeFactor: 2.5,
				dueDate: now,
				createdAt: now
			}));
			cards.update((all) => [...all, ...toAdd]);
			alert(`${toAdd.length} cartões importados!`);
		} else {
			alert('Nenhum cartão válido encontrado.');
		}

		target.value = ''; // Reset input
	}
</script>

<div class="container mx-auto max-w-4xl space-y-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div class="flex-1">
			<Input
				value={deck?.name ?? ''}
				oninput={updateDeckName}
				class="h-auto border-none px-0 py-2 text-2xl font-bold shadow-none focus-visible:ring-0"
				placeholder="Nome do Baralho"
			/>
		</div>
		<div class="flex gap-2">
			<input
				type="file"
				accept=".json,.md,.txt"
				class="hidden"
				bind:this={fileInput}
				onchange={handleFileUpload}
			/>
			<Button
				variant="outline"
				size="icon"
				onclick={() => fileInput.click()}
				title="Importar JSON/MD"
			>
				<Upload class="h-4 w-4" />
			</Button>
			<Button variant="destructive" size="icon" onclick={deleteDeck}>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-[2fr_1fr]">
		<div class="space-y-4">
			<h2 class="text-xl font-semibold">Cartões ({deckCards.length})</h2>

			{#if deckCards.length === 0}
				<div class="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
					Nenhum cartão neste baralho.
				</div>
			{/if}

			{#each deckCards as card (card.id)}
				<Card.Root>
					<Card.Content class="flex items-start justify-between gap-4 p-4">
						<div class="grid flex-1 gap-2">
							<div class="border-b pb-2 text-lg font-medium">{card.front}</div>
							<div class="whitespace-pre-wrap text-muted-foreground">{card.back}</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive"
							onclick={() => deleteCard(card.id)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<div class="space-y-4">
			<Card.Root class="sticky top-4">
				<Card.Header>
					<Card.Title>Novo Cartão</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label>Frente</Label>
						<Textarea bind:value={front} placeholder="Pergunta ou termo..." rows={3} />
					</div>
					<div class="space-y-2">
						<Label>Verso</Label>
						<Textarea bind:value={back} placeholder="Resposta ou definição..." rows={5} />
					</div>
					<Button onclick={addCard} class="w-full">
						<Plus class="mr-2 h-4 w-4" /> Adicionar
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
