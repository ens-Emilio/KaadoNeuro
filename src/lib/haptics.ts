export function haptic(pattern: number | number[]) {
	try {
		if ('vibrate' in navigator) navigator.vibrate(pattern);
	} catch {
		// Haptics are optional; unsupported or denied vibration is a no-op.
	}
}
