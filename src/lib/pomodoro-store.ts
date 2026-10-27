import { derived } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';
import {
	type PomodoroState,
	INITIAL_STATE,
	startWork,
	pause,
	resume,
	reset,
	tick
} from './pomodoro.js';

const pomodoroSchema = z.object({
	phase: z.enum(['idle', 'work', 'shortBreak', 'longBreak']),
	timeRemaining: z.number().nonnegative(),
	completedWorkSessions: z.number().int().nonnegative(),
	paused: z.boolean()
});

function safeParse(raw: string | null): PomodoroState {
	try {
		const parsed = JSON.parse(raw ?? 'null');
		const result = pomodoroSchema.safeParse(parsed);
		if (result.success) return result.data as PomodoroState;
	} catch {
		// fall through
	}
	return { ...INITIAL_STATE };
}

const internal = persisted<PomodoroState>('kaadoneuro_pomodoro', INITIAL_STATE, {
	serializer: {
		stringify: (v) => JSON.stringify(v),
		parse: (raw) => safeParse(raw)
	}
});

type TimerHandle = ReturnType<typeof setInterval>;

let intervalId: TimerHandle | null = null;
let lastTickTime: number | null = null;

function startTicker() {
	if (intervalId !== null) return;
	lastTickTime = Date.now();
	intervalId = setInterval(() => {
		const now = Date.now();
		const elapsed = now - (lastTickTime ?? now);
		lastTickTime = now;

		internal.update((state) => {
			const next = tick(state, elapsed);
			return next ?? state;
		});
	}, 1000);
}

function stopTicker() {
	if (intervalId !== null) {
		clearInterval(intervalId);
		intervalId = null;
		lastTickTime = null;
	}
}

// Auto-start/stop ticker based on state
internal.subscribe((state) => {
	if (state.phase !== 'idle' && !state.paused) {
		startTicker();
	} else {
		stopTicker();
	}
});

export const pomodoro = {
	subscribe: internal.subscribe,
	startWork: () => internal.update(startWork),
	pause: () => internal.update(pause),
	resume: () => internal.update(resume),
	reset: () => {
		stopTicker();
		internal.set(reset());
	}
};

/** Derived readable for convenient UI binding */
export const pomodoroPhase = derived(internal, ($s) => $s.phase);
export const pomodoroTimeRemaining = derived(internal, ($s) => $s.timeRemaining);
export const pomodoroPaused = derived(internal, ($s) => $s.paused);
export const pomodoroCompletedSessions = derived(internal, ($s) => $s.completedWorkSessions);

/** Format mm:ss from milliseconds */
export function formatPomodoroTime(ms: number): string {
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}