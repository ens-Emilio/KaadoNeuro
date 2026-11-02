<script lang="ts">
	import { page } from '$app/state';
	import { Sun, Moon, Monitor, ChevronDown, Check } from '@lucide/svelte';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js';
	import { localeNames, rtlLocales } from '$lib/i18n/locales.js';
	import * as m from '$lib/paraglide/messages.js';
	import { themePreference, applyTheme, type ThemePreference } from '$lib/theme-store.js';
	import { cards } from '$lib/stores.js';
	import { getAllDueCards } from '$lib/review-session.js';
	import { touchVault } from '$lib/secret-vault.js';
	import { autoBackupSettings, isBackupDue, markBackupDone } from '$lib/auto-backup-store.js';
	import { buildSnapshot } from '$lib/backup.js';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import logoMark from '$lib/assets/logo-mark.svg';

	let { children } = $props();

	const navigation = $derived([
		{ href: '/', label: m['nav.home']() },
		{ href: '/stats', label: m['nav.stats']() },
		{ href: '/badges', label: m['nav.badges']() },
		{ href: '/tutorial', label: m['nav.tutorial']() },
		{ href: '/settings/ai', label: m['nav.ai']() },
		{ href: '/settings/sync', label: m['nav.sync']() }
	]);

	let pathname = $derived(page.url.pathname);

	function isActive(href: string) {
		return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
	}

	let locale = $state(getLocale());
	let themeOpen = $state(false);
	let langOpen = $state(false);

	const themeOptions: { value: ThemePreference; icon: typeof Sun; labelKey: keyof typeof m }[] = [
		{ value: 'light', icon: Sun, labelKey: 'theme.light' },
		{ value: 'dark', icon: Moon, labelKey: 'theme.dark' },
		{ value: 'auto', icon: Monitor, labelKey: 'theme.auto' }
	];

	const currentThemeOption = $derived(
		themeOptions.find((o) => o.value === $themePreference) ?? themeOptions[2]
	);

	function selectTheme(pref: ThemePreference) {
		themePreference.set(pref);
		applyTheme(pref);
		themeOpen = false;
	}

	function selectLang(l: (typeof locales)[number]) {
		setLocale(l);
		locale = l;
		document.documentElement.lang = l;
		document.documentElement.dir = rtlLocales[l] ? 'rtl' : 'ltr';
		langOpen = false;
	}

	function themeLabel(key: keyof typeof m): string {
		const fn = m[key];
		return typeof fn === 'function' ? (fn as (...args: any[]) => string)() : String(key);
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const close = () => {
			themeOpen = false;
			langOpen = false;
		};
		window.addEventListener('click', close);
		return () => window.removeEventListener('click', close);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onActivity = () => touchVault();
		window.addEventListener('pointerdown', onActivity, { passive: true });
		window.addEventListener('keydown', onActivity);
		return () => {
			window.removeEventListener('pointerdown', onActivity);
			window.removeEventListener('keydown', onActivity);
		};
	});

	$effect(() => {
		const unsub = themePreference.subscribe((pref) => {
			applyTheme(pref);
		});
		return unsub;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			let current: ThemePreference = 'auto';
			const unsub = themePreference.subscribe((v) => {
				current = v;
				unsub();
			});
			if (current === 'auto') applyTheme('auto');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	$effect(() => {
		locale = getLocale();
		document.documentElement.lang = locale;
		document.documentElement.dir = rtlLocales[locale] ? 'rtl' : 'ltr';
	});
	$effect(() => {
		if (typeof window === 'undefined' || !('setAppBadge' in navigator)) return;
		const now = new Date();
		const dueCount = getAllDueCards($cards, now).length;
		if (dueCount > 0) {
			navigator.setAppBadge(dueCount).catch(() => {});
		} else {
			navigator.clearAppBadge().catch(() => {});
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const settings = $autoBackupSettings;
		if (!isBackupDue(settings, new Date())) return;
		let cancelled = false;
		(async () => {
			try {
				const snapshot = await buildSnapshot();
				if (cancelled) return;
				const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `kaadoneuro-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.style.display = 'none';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				markBackupDone();
			} catch {
				// Silent failure — auto-backup must never block or annoy.
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>KaadoNeuro</title>
	<script>
		(function () {
			try {
				var t = JSON.parse(localStorage.getItem('kaadoneuro_theme') || '"auto"');
				if (t !== 'auto' && t !== 'light' && t !== 'dark') t = 'auto';
				var r =
					t === 'auto'
						? window.matchMedia('(prefers-color-scheme:dark)').matches
							? 'dark'
							: 'light'
						: t;
				document.documentElement.setAttribute('data-theme', r);
			} catch (e) {}
		})();
	</script>
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[var(--accent-solid)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
>
	Skip to content
</a>

<header
	class="sticky top-0 z-30 border-b border-border/70 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-[14px]"
>
	<div class="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6">
		<a
			href="/"
			class="flex items-center gap-2.5 font-display text-[22px] tracking-[-0.02em]"
			aria-label={m['brand.home']()}
		>
			<img
				src={logoMark}
				alt=""
				width="32"
				height="32"
				class="size-8 shrink-0"
				aria-hidden="true"
			/>
			<span>KaadoNeuro</span>
		</a>
		<nav
			aria-label={m['nav.language']()}
			class="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-border/60 pt-2 md:order-none md:ms-4 md:w-auto md:border-0 md:pt-0"
		>
			{#each navigation as item}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class="shrink-0 border-b-2 px-2.5 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase transition-colors {isActive(
						item.href
					)
						? 'border-[var(--accent-text)] text-accent'
						: 'border-transparent text-muted-foreground hover:border-[var(--border-semantic)] hover:text-foreground'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="ms-auto flex items-center gap-2">
			<!-- Language Dropdown -->
			<div class="relative">
				<button
					onclick={(e) => {
						e.stopPropagation();
						langOpen = !langOpen;
						themeOpen = false;
					}}
					class="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--border-strong)]"
					aria-label={m['nav.language']()}
					aria-expanded={langOpen}
				>
					{localeNames[locale] ?? locale}
					<ChevronDown class="size-3 opacity-60" aria-hidden="true" />
				</button>
				{#if langOpen}
					<div
						onclick={(e) => e.stopPropagation()}
						class="absolute end-0 top-full z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
					>
						{#each locales as l}
							<button
								onclick={() => selectLang(l)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--accent-muted)] {locale ===
								l
									? 'text-accent'
									: 'text-foreground'}"
							>
								{localeNames[l] ?? l}
								{#if locale === l}
									<Check class="size-3.5" aria-hidden="true" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Theme Dropdown -->
			<div class="relative">
				<button
					onclick={(e) => {
						e.stopPropagation();
						themeOpen = !themeOpen;
						langOpen = false;
					}}
					class="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--border-strong)]"
					aria-label={m['theme.label']()}
					aria-expanded={themeOpen}
				>
					<currentThemeOption.icon class="size-3.5" aria-hidden="true" />
					{themeLabel(currentThemeOption.labelKey)}
					<ChevronDown class="size-3 opacity-60" aria-hidden="true" />
				</button>
				{#if themeOpen}
					<div
						onclick={(e) => e.stopPropagation()}
						class="absolute end-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-card shadow-lg"
					>
						{#each themeOptions as opt}
							<button
								onclick={() => selectTheme(opt.value)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--accent-muted)] {$themePreference ===
								opt.value
									? 'text-accent'
									: 'text-foreground'}"
							>
								<span class="flex items-center gap-2">
									<opt.icon class="size-3.5" aria-hidden="true" />
									{themeLabel(opt.labelKey)}
								</span>
								{#if $themePreference === opt.value}
									<Check class="size-3.5" aria-hidden="true" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<main id="main-content" tabindex="-1" class="outline-none">
	{@render children()}
</main>

<footer class="border-t border-border/50 py-2 text-center">
	<p class="text-[10px] text-muted-foreground">KaadoNeuro v1.1.0</p>
</footer>
