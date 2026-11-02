import { describe, it, expect } from 'vitest';
import {
	type PomodoroState,
	INITIAL_STATE,
	startWork,
	pause,
	resume,
	reset,
	tick,
	DURATIONS
} from './pomodoro.js';

describe('Pomodoro state machine', () => {
	describe('startWork', () => {
		it('starts work from idle', () => {
			const state = startWork(INITIAL_STATE);
			expect(state.phase).toBe('work');
			expect(state.timeRemaining).toBe(DURATIONS.work);
			expect(state.paused).toBe(false);
			expect(state.inLongBreak).toBe(false);
		});

		it('blocks startWork when inLongBreak is true', () => {
			const blockedState: PomodoroState = {
				...INITIAL_STATE,
				phase: 'longBreak',
				timeRemaining: DURATIONS.longBreak,
				inLongBreak: true
			};
			const result = startWork(blockedState);
			expect(result.phase).toBe('longBreak');
			expect(result.inLongBreak).toBe(true);
		});
	});

	describe('tick - work cycle progression', () => {
		it('completes first work session and enters short break', () => {
			let state = startWork(INITIAL_STATE);
			state = tick(state, DURATIONS.work)!;
			expect(state.phase).toBe('shortBreak');
			expect(state.completedWorkSessions).toBe(1);
			expect(state.inLongBreak).toBe(false);
		});

		it('completes second work session and enters short break', () => {
			let state = startWork(INITIAL_STATE);
			state = tick(state, DURATIONS.work)!; // work 1 -> short break
			state = tick(state, DURATIONS.shortBreak)!; // short break -> work
			state = tick(state, DURATIONS.work)!; // work 2 -> short break
			expect(state.phase).toBe('shortBreak');
			expect(state.completedWorkSessions).toBe(2);
		});

		it('completes third work session and enters short break', () => {
			let state = startWork(INITIAL_STATE);
			// Cycle through 2 complete work+shortBreak pairs
			for (let i = 0; i < 2; i++) {
				state = tick(state, DURATIONS.work)!;
				state = tick(state, DURATIONS.shortBreak)!;
			}
			// Third work session
			state = tick(state, DURATIONS.work)!;
			expect(state.phase).toBe('shortBreak');
			expect(state.completedWorkSessions).toBe(3);
		});

		it('completes fourth work session and enters forced long break with inLongBreak=true', () => {
			let state = startWork(INITIAL_STATE);
			// Complete 3 work sessions with short breaks
			for (let i = 0; i < 3; i++) {
				state = tick(state, DURATIONS.work)!;
				state = tick(state, DURATIONS.shortBreak)!;
			}
			// Fourth work session should trigger long break
			state = tick(state, DURATIONS.work)!;
			expect(state.phase).toBe('longBreak');
			expect(state.completedWorkSessions).toBe(4);
			expect(state.inLongBreak).toBe(true);
			expect(state.timeRemaining).toBe(DURATIONS.longBreak);
		});

		it('blocks new work session during forced long break', () => {
			let state = startWork(INITIAL_STATE);
			// Complete 4 work sessions to enter long break
			for (let i = 0; i < 3; i++) {
				state = tick(state, DURATIONS.work)!;
				state = tick(state, DURATIONS.shortBreak)!;
			}
			state = tick(state, DURATIONS.work)!; // enters longBreak with inLongBreak=true

			// Try to start work during long break - should be blocked
			const attempt = startWork(state);
			expect(attempt.phase).toBe('longBreak');
			expect(attempt.inLongBreak).toBe(true);
		});

		it('resets inLongBreak after long break completes', () => {
			let state = startWork(INITIAL_STATE);
			// Complete 4 work sessions
			for (let i = 0; i < 3; i++) {
				state = tick(state, DURATIONS.work)!;
				state = tick(state, DURATIONS.shortBreak)!;
			}
			state = tick(state, DURATIONS.work)!; // longBreak
			expect(state.inLongBreak).toBe(true);

			// Complete long break
			state = tick(state, DURATIONS.longBreak)!;
			expect(state.phase).toBe('idle');
			expect(state.completedWorkSessions).toBe(0);
			expect(state.inLongBreak).toBe(false);

			// Should now be able to start work again
			state = startWork(state);
			expect(state.phase).toBe('work');
			expect(state.inLongBreak).toBe(false);
		});
	});

	describe('pause/resume/reset', () => {
		it('pause does nothing when idle', () => {
			const result = pause(INITIAL_STATE);
			expect(result).toEqual(INITIAL_STATE);
		});

		it('resume does nothing when idle', () => {
			const result = resume(INITIAL_STATE);
			expect(result).toEqual(INITIAL_STATE);
		});

		it('reset returns to initial state', () => {
			const state = startWork(INITIAL_STATE);
			const result = reset();
			expect(result).toEqual(INITIAL_STATE);
		});
	});
});
