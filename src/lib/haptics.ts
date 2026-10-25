export function haptic(pattern: number | number[]) {
	try {
		if ('vibrate' in navigator) navigator.vibrate(pattern);
	} catch {}
}
