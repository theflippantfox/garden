<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { beforeNavigate } from '$app/navigation';

	let { children } = $props();

	// Intercept wiki-link clicks before SvelteKit's router processes them
	beforeNavigate(({ cancel, to }) => {
		if (to?.url.hash.startsWith('#wiki-')) {
			cancel();
			document.dispatchEvent(new CustomEvent('wiki-navigate', { detail: { slug: to.url.hash.slice(1) } }));
		}
	});

	// Svelte action: intercept wiki-link clicks in capture phase (before any other handlers)
	function wikiNav(node: HTMLElement) {
		function handler(e: Event) {
			const target = e.target as Element;
			if (!target?.closest?.('a.wiki')) return;
			e.stopPropagation();
			const hash = (target as HTMLAnchorElement).href.split('#')[1];
			if (hash?.startsWith('wiki-')) {
				e.preventDefault();
				document.dispatchEvent(new CustomEvent('wiki-navigate', { detail: { slug: hash.slice(5) } }));
			}
		}
		node.addEventListener('click', handler, true); // capture phase!
		return {
			destroy() {
				node.removeEventListener('click', handler, true);
			}
		};
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Digital Garden</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- svelte-ignore a11y_autofocus -->
<div class="app" use:wikiNav data-sveltekit-preload-data="off">
	{@render children()}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #0a0a0f;
		color: #e4e4e7;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(a) {
		color: #60a5fa;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	:global(a:hover) {
		color: #93c5fd;
	}

	:global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9em;
	}

	:global(:not(pre) > code) {
		background: #1a1a24;
		color: #a78bfa;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		border: 1px solid #27272f;
	}

	:global(pre) {
		background: #0f0f14;
		border: 1px solid #1f1f28;
		border-radius: 8px;
		padding: 1.25rem;
		overflow-x: auto;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	:global(pre code) {
		background: none;
		padding: 0;
		border: none;
		color: #e4e4e7;
	}

	/* Highlight.js theme adjustments for dark mode */
	:global(.hljs-keyword) {
		color: #c084fc;
	}
	:global(.hljs-string) {
		color: #86efac;
	}
	:global(.hljs-title) {
		color: #60a5fa;
	}
	:global(.hljs-comment) {
		color: #6b7280;
	}
	:global(.hljs-function) {
		color: #fbbf24;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>