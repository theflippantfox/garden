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
	// pi-lens-ignore: lint/correctness/noUnusedVariables
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
	<meta name="viewport" content="width=device-width, initial-scale=1" />
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
	:root {
		--bg: #0a0a12;
		--surface: #12121e;
		--surface-hover: #1a1a2a;
		--border: #1e1e30;
		--border-subtle: #141425;
		--text: #e8e8f0;
		--text-secondary: #8888a0;
		--text-muted: #555570;
		--accent: #7c6aef;
		--accent-hover: #9585f5;
		--accent-subtle: rgba(124, 106, 239, 0.1);
		--link: #6da0ef;
		--code-bg: #0e0e1a;
		--code-inline-bg: #161625;
		--radius-sm: 6px;
		--radius-md: 10px;
		--radius-lg: 14px;
		--shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: var(--bg);
		color: var(--text);
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(a) {
		color: var(--link);
		text-decoration: none;
		transition: color 200ms ease;
	}

	:global(a:hover) {
		color: #93c5fd;
	}

	:global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9em;
	}

	:global(:not(pre) > code) {
		background: var(--code-inline-bg);
		color: var(--accent);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		border: 1px solid var(--border);
	}

	:global(pre) {
		background: var(--code-bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		overflow-x: auto;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	:global(pre code) {
		background: none;
		padding: 0;
		border: none;
		color: var(--text);
	}

	/* Highlight.js theme adjustments */
	:global(.hljs-keyword) {
		color: #c084fc;
	}
	:global(.hljs-string) {
		color: #86efac;
	}
	:global(.hljs-title) {
		color: var(--link);
	}
	:global(.hljs-comment) {
		color: #555570;
	}
	:global(.hljs-function) {
		color: #fbbf24;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.6;
		}
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>