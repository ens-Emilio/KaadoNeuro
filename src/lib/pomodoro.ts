// Pure Pomodoro state machine — no side effects, no timers.
// Timer logic lives in the store; this module only defines transitions.

export type PomodoroPhase = 'idle' | 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
	phase: PomodoroPhase;
	/** Milliseconds remaining in current phase */
	timeRemaining: number;
	/** Completed work sessions in current cycle (0–3 during work, resets after long break) */
	completedWorkSessions: number;
	/** Whether timer is paused (only meaningful when phase !== 'idle') */
	paused: boolean;
}

export const DURATIONS = {
	work: 25 * 60 * 1000,
	shortBreak: 5 * 60 * 1000,
	longBreak: 15 * 60 * 1000
} as const;

export const INITIAL_STATE: PomodoroState = {
	phase: 'idle',
	timeRemaining: 0,
	completedWorkSessions: 0,
	paused: false
};

export function startWork(state: PomodoroState): PomodoroState {
	return {
		...state,
		phase: 'work',
		timeRemaining: DURATIONS.work,
		paused: false
	};
}

export function pause(state: PomodoroState): PomodoroState {
	if (state.phase === 'idle') return state;
	return { ...state, paused: true };
}

export function resume(state: PomodoroState): PomodoroState {
	if (state.phase === 'idle') return state;
	return { ...state, paused: false };
}

export function reset(): PomodoroState {
	return { ...INITIAL_STATE };
}

/**
 * Advance to next phase when time runs out.
 * Returns null if timer hasn't expired yet.
 */
export function tick(state: PomodoroState, elapsedMs: number): PomodoroState | null {
	if (state.phase === 'idle' || state.paused) return null;

	const newRemaining = state.timeRemaining - elapsedMs;
	if (newRemaining > 0) {
		return { ...state, timeRemaining: newRemaining };
	}

	// Phase completed — transition
	switch (state.phase) {
		case 'work': {
			const completed = state.completedWorkSessions + 1;
			if (completed >= 4) {
				return {
					phase: 'longBreak',
					timeRemaining: DURATIONS.longBreak,
					completedWorkSessions: completed,
					paused: false
				};
			}
			return {
				phase: 'shortBreak',
				timeRemaining: DURATIONS.shortBreak,
				completedWorkSessions: completed,
				paused: false
			};
		}
		case 'shortBreak':
			return {
				phase: 'work',
				timeRemaining: DURATIONS.work,
				completedWorkSessions: state.completedWorkSessions,
				paused: false
			};
		case 'longBreak':
			return {
				phase: 'idle',
				timeRemaining: 0,
				completedWorkSessions: 0,
				paused: false
			};
		default:
			return null;
	}
}
