import { readable } from 'svelte/store';

/** Emits at local midnight and when a suspended tab becomes visible. */
function msUntilNextLocalMidnight(now: Date): number {
	const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
	return Math.max(1000, next.getTime() - now.getTime());
}

export const clock = readable(new Date(), (set) => {
	let timer: ReturnType<typeof setTimeout>;
	const tick = () => {
		const now = new Date();
		set(now);
		timer = setTimeout(tick, msUntilNextLocalMidnight(now));
	};
	const onVisibility = () => {
		if (document.visibilityState !== 'visible') return;
		clearTimeout(timer);
		tick();
	};
	tick();
	if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
	return () => {
		clearTimeout(timer);
		if (typeof document !== 'undefined')
			document.removeEventListener('visibilitychange', onVisibility);
	};
});

export function localDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
