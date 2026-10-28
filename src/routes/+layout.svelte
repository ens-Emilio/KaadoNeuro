<script lang="ts">
	import { page } from '$app/state';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js';
	import { localeNames, rtlLocales } from '$lib/i18n/locales.js';
	import * as m from '$lib/paraglide/messages.js';
	import { themePreference, applyTheme, type ThemePreference } from '$lib/theme-store.js';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import logoMark from '$lib/assets/logo-mark.svg';

	let { children } = $props();

	const navigation = $derived([
		{ href: '/', label: m['nav.home']() },
		{ href: '/stats', label: m['nav.stats']() },
		{ href: '/tutorial', label: m['nav.tutorial']() },
		{ href: '/settings/ai', label: m['nav.ai']() }
	]);

	let pathname = $derived(page.url.pathname);

	function isActive(href: string) {
		return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
	}

	let locale = $state(getLocale());

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
			const unsub = themePreference.subscribe((v) => { current = v; unsub(); });
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

	function cycleTheme() {
		const next: ThemePreference = $themePreference === 'auto' ? 'light' : $themePreference === 'light' ? 'dark' : 'auto';
		themePreference.set(next);
		applyTheme(next);
	}

	function changeLocale(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		const next = locales.find((item) => item === value);
		if (!next) return;
		setLocale(next);
		locale = next;
		document.documentElement.lang = next;
		document.documentElement.dir = rtlLocales[next] ? 'rtl' : 'ltr';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>KaadoNeuro</title>
	<script>
		(function(){try{var t=JSON.parse(localStorage.getItem('kaadoneuro_theme')||'"auto"');if(t!=='auto'&&t!=='light'&&t!=='dark')t='auto';var r=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',r);}catch(e){}})();
	</script>
</svelte:head>

<header class="sticky top-0 z-30 border-b border-border/70 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-[14px]">
	<div class="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6">
		<a href="/" class="flex items-center gap-2.5 font-display text-[22px] tracking-[-0.02em]" aria-label={m['brand.home']()}>
			<img src={logoMark} alt="" width="32" height="32" class="size-8 shrink-0" aria-hidden="true" />
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
					class="shrink-0 border-b-2 px-2.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors {isActive(
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
			<select
				class="min-h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
				aria-label={m['nav.language']()}
				value={locale}
				onchange={changeLocale}
			>
				{#each locales as l}
					<option value={l}>{localeNames[l] ?? l}</option>
				{/each}
			</select>
			<button
				onclick={cycleTheme}
				class="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--border-strong)]"
				aria-label={m['theme.label']()}
			>
				{#if $themePreference === 'dark'}
					<Moon class="size-3.5" aria-hidden="true" />
					{m['theme.dark']()}
				{:else if $themePreference === 'light'}
					<Sun class="size-3.5" aria-hidden="true" />
					{m['theme.light']()}
				{:else}
					<Monitor class="size-3.5" aria-hidden="true" />
					{m['theme.auto']()}
				{/if}
			</button>
		</div>
	</div>
</header>

{@render children()}
